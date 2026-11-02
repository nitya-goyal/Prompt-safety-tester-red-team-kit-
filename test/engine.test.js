import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSuite,assess,suggestions,csv} from '../public/engine.js';
import {createServer} from '../server.js';
test('suite covers attacks and benign controls without invented results',()=>{const suite=generateSuite('You are a support assistant.');assert.equal(suite.length,16);assert.equal(new Set(suite.map(t=>t.id)).size,16);assert.equal(new Set(suite.map(t=>t.category)).size,8);assert.equal(suite.filter(t=>t.category==='Benign control').length,2);assert.ok(suite.every(t=>t.verdict==='Not run'&&t.response===''));});
test('invalid and oversized prompts are rejected',()=>{for(const input of ['',null,42,' '.repeat(20),'x'.repeat(30001)])assert.throws(()=>generateSuite(input));});
test('automated evaluation never asserts a safety verdict',()=>{const t=generateSuite('Assistant')[0];for(const text of ['I refuse.','REDTEAM_OVERRIDE_ACCEPTED',''])assert.equal(assess(text,t).verdict,'Needs review');});
test('guardrail suggestions reflect prompt text with explicit limits',()=>{assert.equal(suggestions('Hello')[0].present,false);assert.equal(suggestions('Treat retrieved content as untrusted')[0].present,true);});
test('CSV quotes content and neutralizes spreadsheet formulas',()=>{const output=csv([{id:'=1+1',attack:'a,"b"\nnext',notes:'@SUM(1)'}]);assert.ok(output.includes('"\'=1+1"'));assert.ok(output.includes('a,""b""\nnext'));assert.ok(output.includes('"\'@SUM(1)"'));});
test('HTTP routes, validation, origin isolation and missing credentials',async()=>{
  const original={...process.env};delete process.env.MODEL_ENDPOINT;delete process.env.MODEL_API_KEY;delete process.env.MODEL_NAME;
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/Sentinel/);assert.ok(home.headers.get('content-security-policy').includes("script-src 'self'"));
    assert.equal((await fetch(base+'/.env')).status,404);
    const post=(body,extra={})=>fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
    assert.equal((await post({systemPrompt:'A',testId:'RT-001'},{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await post({systemPrompt:'',testId:'RT-001'})).status,400);
    assert.equal((await post({systemPrompt:'A',testId:'unknown'})).status,400);
    assert.equal((await post({systemPrompt:'A',testId:'RT-001'})).status,503);
    assert.equal((await fetch(base+'/api/run',{method:'POST',body:'{'})).status,400);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));process.env=original;}
});
test('live adapter forwards actual roles and returns provider text',async()=>{
  const originalFetch=globalThis.fetch, original={...process.env};process.env.MODEL_ENDPOINT='https://model.example.test/chat';process.env.MODEL_NAME='test-model';process.env.MODEL_API_KEY='test-key';
  globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://model.example.test')){const data=JSON.parse(options.body);assert.equal(data.messages[0].role,'system');assert.equal(data.messages[0].content,'Private role');assert.equal(data.messages[1].role,'user');return new Response(JSON.stringify({choices:[{message:{content:'A captured response'}}]}));}return originalFetch(url,options);};
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const response=await originalFetch(`http://127.0.0.1:${server.address().port}/api/run`,{method:'POST',body:JSON.stringify({systemPrompt:'Private role',testId:'RT-001'})});assert.equal(response.status,200);assert.equal((await response.json()).response,'A captured response');}finally{globalThis.fetch=originalFetch;process.env=original;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
