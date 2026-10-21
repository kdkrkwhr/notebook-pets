// Check the published subpath, source provenance and actual Graphify interaction.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../../web/dist/',import.meta.url));
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/notebook-pets\//,'');
 if(!route||route.endsWith('/'))route+='index.html';
 const file=path.resolve(root,route);if(!file.startsWith(path.resolve(root)+path.sep))throw Error();
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.mjs':'text/javascript','.wasm':'application/wasm'};
 res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`;
 const url=new URL('architecture/',base).href;
 const response=await page.request.get(new URL('metadata.json',url).href);assert(response.ok());
 const metadata=await response.json();assert(metadata.files.includes('engine/game_api.py'));assert(metadata.nodeCount>0);assert.match(metadata.revision,/^[a-f0-9]{40}$/);
 if(process.env.EXPECTED_COMMIT)assert.equal(metadata.revision,process.env.EXPECTED_COMMIT);
 for(const file of ['graph.json','GRAPH_REPORT.md','graph.html']){
  const result=await page.request.get(new URL(file,url).href);assert(result.ok(),file);
  assert.doesNotMatch(await result.text(),/(?<![A-Za-z])[A-Za-z]:[\\/]|\/Users\/|\/home\/runner\/|notebuddy-graph-/);
 }
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#files').children.length>50);
 assert.equal(await page.locator('#files a').count(),metadata.fileCount);
 assert.equal(await page.locator('#flow li').count(),4);
 await page.locator('[data-platform="anna"]').click();assert.match(await page.locator('#flow').innerText(),/notebuddy_plugin.py/);
 await page.locator('[data-platform="web"]').click();assert.match(await page.locator('#flow').innerText(),/web\/worker.js/);
 await page.locator('[data-search="game_api"]').click();assert.equal(await page.locator('#files a').count(),1);
 assert.equal(await page.locator('#files a').getAttribute('href'),`https://github.com/kdkrkwhr/notebook-pets/blob/${metadata.revision}/engine/game_api.py`);
 await page.locator('#file-search').fill('there-is-no-such-file');assert.equal(await page.locator('#files a').count(),0);
 await page.locator('#clear-search').click();assert.equal(await page.locator('#files a').count(),metadata.fileCount);
 const shots=fileURLToPath(new URL('../../.local/architecture-check/',import.meta.url));await mkdir(shots,{recursive:true});
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(shots,'desktop.png')});
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await page.screenshot({path:path.join(shots,'mobile.png')});
 }
 await page.locator('iframe').scrollIntoViewIfNeeded();
 const frame=page.frameLocator('iframe');await frame.locator('#graph canvas').waitFor({timeout:60000});
 await frame.locator('#search').fill('transition');
 await frame.locator('#search-results').waitFor({state:'visible'});
 await frame.locator('#search-results').getByText('transition()',{exact:true}).click();
 await page.waitForTimeout(400);
 assert.match(await frame.locator('#info-content').innerText(),/transition/);
 assert(await frame.locator('.legend-item').count()>0);
 await frame.locator('#notebuddy-fit').click();
 await page.waitForTimeout(1200);
 assert(await frame.locator('canvas').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4===3&&value>0)));
 await page.screenshot({path:path.join(shots,'graph.png')});
 const demo=await page.request.get(base);assert(demo.ok());assert.match(await demo.text(),/href="\.\/architecture\/"/);
 assert.deepEqual(errors,[]);
 console.log(`Architecture passed: ${metadata.fileCount} files, ${metadata.nodeCount} nodes; filters, source links, graph search/selection, four viewport widths; ${metadata.revision}`);
}finally{server.closeAllConnections();await browser?.close();await new Promise(resolve=>server.close(resolve));}
