// Exercise real static pages under the GitHub Pages subpath, with no game save or AI.
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
 const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.md':'text/plain'};
 res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch(process.platform==='win32'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 const base=process.env.WEB_URL??`http://127.0.0.1:${server.address().port}/notebook-pets/`,wiki=new URL('wiki/',base).href;
 const metaResponse=await page.request.get(new URL('metadata.json',wiki).href);assert(metaResponse.ok());
 const meta=await metaResponse.json();assert.equal(meta.guideCount,8);assert(meta.graphifyArticleCount>30);
 if(process.env.EXPECTED_COMMIT)assert.equal(meta.revision,process.env.EXPECTED_COMMIT);
 assert.match(meta.reviewedRevision,/^[a-f0-9]{40}$/);
 assert(meta.pages.every(p=>p.changedSources.length===0),'Source review must be current for this release');
 const index=await (await page.request.get(new URL('search-index.json',wiki).href)).json();
 assert.equal(index.length,meta.guideCount+meta.graphifyArticleCount+1);
 // Crawl every rendered article and each unique local document/download link.
 const links=new Set();
 for(const entry of index){
  const url=new URL(entry.url,wiki),r=await page.request.get(url.href);assert(r.ok(),url.href);
  const html=await r.text();assert.match(html,/<h1>/);assert.doesNotMatch(html,/__[A-Z_]+__/);
  assert.doesNotMatch(html,/(?<![A-Za-z])[A-Za-z]:[\\/]|\/Users\/|\/home\/runner\/|notebuddy-graph-/);
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const target=new URL(match[1].replaceAll('&amp;','&'),url);target.hash='';
   if(target.origin===url.origin)links.add(target.href);
  }
 }
 for(const url of links){const r=await page.request.get(url);assert(r.ok(),`Broken published link: ${url}`);}
 await page.goto(wiki);await page.waitForFunction(()=>document.body.dataset.searchReady==='true');
 assert.equal(await page.locator('article h1').innerText(),'노트버디 프로젝트 위키');
 await page.locator('#wiki-search').fill('진화');assert(await page.locator('#search-results a').count()>0);
 await page.locator('#search-results').getByRole('link',{name:'캐릭터 탄생과 진화',exact:true}).click();
 assert.match(page.url(),/birth\.html$/);assert.match(await page.locator('article').innerText(),/돌봄 60회/);
 assert.equal(await page.locator('article a', {hasText:'evolution.py'}).first().getAttribute('href'),`https://github.com/kdkrkwhr/notebook-pets/blob/${meta.reviewedRevision}/engine/evolution.py`);
 await page.waitForFunction(()=>document.body.dataset.searchReady==='true');
 await page.locator('#wiki-search').fill('transition');assert(await page.locator('#search-results .result-kind',{hasText:'Graphify'}).count()>0);
 await page.locator('#wiki-search').fill('<img onerror=alert(1)>');assert.equal(await page.locator('#search-results a').count(),0);assert.equal(await page.locator('#search-results img').count(),0);
 await page.locator('#clear-search').click();assert(await page.locator('#search-results').isHidden());
 await page.goto(new URL('graphify/index.html',wiki).href);await page.waitForFunction(()=>document.body.dataset.searchReady==='true');
 await page.locator('article a[href$=".html"]').first().click();assert.match(page.url(),/\/wiki\/graphify\//);
 await page.waitForFunction(()=>document.body.dataset.searchReady==='true');await page.locator('#wiki-search').fill('저장');
 await page.locator('#search-results').getByRole('link',{name:'플랫폼과 데이터',exact:true}).click();
 const shots=fileURLToPath(new URL('../../.local/wiki-check/',import.meta.url));await mkdir(shots,{recursive:true});
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1050});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
  if([1440,390].includes(width))await page.screenshot({path:path.join(shots,`wiki-${width}.png`),fullPage:true});
 }
 const raw=await page.request.get(new URL('markdown/birth.md',wiki).href);assert(raw.ok());assert.match(await raw.text(),new RegExp(meta.reviewedRevision));
 const zip=await page.request.get(new URL('notebuddy-wiki.zip',wiki).href);assert(zip.ok());assert.equal((await zip.body()).subarray(0,2).toString(),'PK');
 const nojs=await browser.newContext({javaScriptEnabled:false});const plain=await nojs.newPage();await plain.goto(wiki);assert.equal(await plain.locator('article h1').innerText(),'노트버디 프로젝트 위키');await nojs.close();
 assert(requests.every(url=>new URL(url).origin===new URL(wiki).origin),'Wiki must not call a third-party API');
 assert.deepEqual(errors,[]);
 console.log(`Wiki passed: ${index.length} pages, ${links.size} local links, Korean/English search, deep links, no-JS, downloads, four viewports; ${meta.revision}`);
}finally{server.closeAllConnections();await browser?.close();await new Promise(resolve=>server.close(resolve));}
