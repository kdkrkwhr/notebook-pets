// Local static test server only: no game backend, account, API key or paid AI.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../../',import.meta.url));
const modules=['engine','domain','ports','game_api','art','dungeons','collectibles','equipment','journeys','personality','home','home_world','evolution'];
const sources=Object.fromEntries(await Promise.all(modules.map(async name=>[name,await readFile(path.join(root,'engine',name+'.py'),'utf8')])));
const rules=await readFile(path.join(root,'data/game_data.json'),'utf8');
const templates=await readFile(path.join(root,'data/image_prompts.json'),'utf8');
const python=await readFile(new URL('./smoke.py',import.meta.url),'utf8');
const server=createServer(async(req,res)=>{
 try{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route==='/'){res.setHeader('content-type','text/html');return res.end('<!doctype html><title>Portable core check</title>');}
  if(!/^\/[a-zA-Z0-9_.-]+$/.test(route)){res.writeHead(404);return res.end();}
  const content=await readFile(new URL('./node_modules/pyodide'+route,import.meta.url));
  res.setHeader('content-type',route.endsWith('.wasm')?'application/wasm':route.endsWith('.js')||route.endsWith('.mjs')?'text/javascript':'application/octet-stream');res.end(content);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage();
 const base=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(base);
 await page.addScriptTag({url:base+'pyodide.js'});
 const result=await page.evaluate(async({base,sources,rules,templates,python})=>{
  const py=await loadPyodide({indexURL:base});
  py.FS.mkdir('/core');
  for(const [name,source] of Object.entries(sources))py.FS.writeFile('/core/'+name+'.py',source);
  py.globals.set('rules_json',rules);py.globals.set('templates_json',templates);
  return JSON.parse(py.runPython(python));
 },{base,sources,rules,templates,python});
 assert.equal(result.platform,'emscripten');assert.equal(result.xp,10);
 assert.equal(result.owned,'ember-horns');assert.equal(result.sameReplay,true);
 assert.equal(result.filesystemAdapterLoaded,false);
 console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
