import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {items,regions,slots,selectItems,fitRules} from '../bundle/items.mjs';

test('catalog covers each region and slot once with unique, localized, bundled item art',async()=>{
 assert.equal(items.length,24);assert.equal(new Set(items.map(i=>i.id)).size,24);
 assert.deepEqual(regions,['common','hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity']);
 for(const region of regions)for(const slot of slots)assert.equal(items.filter(i=>i.region===region&&i.slot===slot).length,1);
 for(const item of items){
  assert.match(item.id,/^[a-z]+(?:-[a-z]+)*$/);
  for(const field of ['name','description'])assert.ok(item[field].length===2&&item[field].every(v=>typeof v==='string'&&v.length>3),item.id);
  assert.ok(fitRules[item.slot]);
  const source=await readFile(new URL(`../../assets/items-v1/${item.id}.png`,import.meta.url));
  const bundle=await readFile(new URL(`../bundle/${item.icon}`,import.meta.url));
  assert.equal(source.subarray(1,4).toString(),'PNG');assert.deepEqual(bundle,source,item.id);
 }
});

test('region, slot and localized text filters combine without changing the catalog',()=>{
 const before=JSON.stringify(items);
 assert.deepEqual(selectItems({region:'icekingdom',slot:'head'}).map(i=>i.id),['frost-crown']);
 assert.deepEqual(selectItems({query:'  목도리 ',language:'ko'}).map(i=>i.id),['red-scarf','snowflake-scarf']);
 assert.deepEqual(selectItems({query:'CAPE',region:'hellgate'}).map(i=>i.id),['blazing-cape']);
 assert.deepEqual(selectItems({region:'sunkenpalace',query:'진주',language:'ko'}).map(i=>i.id),['coral-tiara','pearl-pendant','bubble-orbit']);
 assert.deepEqual(selectItems({region:'clockworkcity',slot:'neck',query:'WATCH'}).map(i=>i.id),['clockwork-locket']);
 assert.deepEqual(selectItems({query:'<script>alert(1)</script>'}),[]);
 assert.deepEqual(selectItems({region:'nonexistent'}),[]);
 assert.equal(JSON.stringify(items),before);
});
