import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('dist/',root),{recursive:true});
for(const file of ['index.html','app.js','engine.js','style.css']) await copyFile(new URL(`public/${file}`,root),new URL(`dist/${file}`,root));
const app=await readFile(new URL('dist/app.js',root),'utf8');
await writeFile(new URL('dist/app.js',root),app+"\n$('run').disabled=true; $('run').textContent='Live tests: local server required'; $('run').title='Run npm start locally and configure a model provider to enable live tests.';\n");
const html=await readFile(new URL('dist/index.html',root),'utf8');
await writeFile(new URL('dist/index.html',root),html.replace('href="/style.css"','href="./style.css"').replace('src="/app.js"','src="./app.js"').replace('href="/"','href="./"').replace('Live tests send the system prompt and attack to your server-configured model provider and may incur usage charges.','This hosted edition supports manual evaluation. To run live tests, start the local server and configure a model provider as described in the repository README.'));
console.log('Static website built in dist/ (manual evaluation edition).');
