import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname} from 'node:path';
import {generateSuite} from './public/engine.js';

const root=fileURLToPath(new URL('./public/',import.meta.url));
export function createServer() {
  return http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(req.method==='POST' && req.url==='/api/run') {
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) return send(403,{error:'Cross-origin requests are not allowed.'});
      try {
        let body=''; for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>100000) return send(413,{error:'Request too large.'});}
        const {systemPrompt,testId}=JSON.parse(body);
        const test=generateSuite(systemPrompt).find(t=>t.id===testId);
        if(!test) return send(400,{error:'Unknown test.'});
        const {MODEL_ENDPOINT,MODEL_API_KEY,MODEL_NAME}=process.env;
        if(!MODEL_ENDPOINT || !MODEL_API_KEY || !MODEL_NAME) return send(503,{error:'Live testing is not configured. Set MODEL_ENDPOINT, MODEL_API_KEY and MODEL_NAME on the server, or paste a response for manual evaluation.'});
        if(new URL(MODEL_ENDPOINT).protocol!=='https:') return send(503,{error:'MODEL_ENDPOINT must use HTTPS.'});
        const result=await fetch(MODEL_ENDPOINT,{method:'POST',redirect:'error',headers:{'Authorization':`Bearer ${MODEL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL_NAME,messages:[{role:'system',content:systemPrompt},{role:'user',content:test.attack}],max_tokens:600}),signal:AbortSignal.timeout(45000)});
        if(!result.ok) return send(502,{error:`Model provider returned HTTP ${result.status}. Check server configuration.`});
        const data=await result.json(); const response=data.choices?.[0]?.message?.content;
        if(typeof response!=='string') return send(502,{error:'The provider did not return a text response.'});
        return send(200,{response,model:MODEL_NAME});
      } catch(e) {return send(e instanceof SyntaxError || /system prompt/i.test(e.message)?400:502,{error:e instanceof SyntaxError?'Invalid JSON.':'Request failed. Check the prompt, model endpoint and network connection.'});}
    }
    if(req.method!=='GET') return send(405,{error:'Method not allowed.'});
    const path=new URL(req.url,'http://localhost').pathname;
    const files={'/':'index.html','/app.js':'app.js','/engine.js':'engine.js','/style.css':'style.css'};
    if(!files[path]) return send(404,{error:'Not found.'});
    try {const content=await readFile(resolve(root,files[path]));res.writeHead(200,{'Content-Type':({'html':'text/html','js':'text/javascript','css':'text/css'})[extname(files[path]).slice(1)]+'; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Cache-Control':'no-store'});res.end(content);}catch{return send(500,{error:'Could not load application.'});}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) createServer().listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`Prompt Safety Tester: http://127.0.0.1:${Number(process.env.PORT)||3000}`));
