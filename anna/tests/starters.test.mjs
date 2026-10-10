import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {starter} from '../bundle/model.mjs';

test('every starter uses the complete reviewed set, with identical shipped bytes',async()=>{
 const root=new URL('../../',import.meta.url);
 const rules=JSON.parse(await readFile(new URL('data/game_data.json',root),'utf8'));
 const manifest=JSON.parse(await readFile(new URL('assets/starters-v1/manifest.json',root),'utf8'));
 assert.equal(manifest.length,Object.keys(rules.species).length*Object.keys(rules.elements).length);
 for(const species of Object.keys(rules.species))for(const element of Object.keys(rules.elements)){
  const name=`${species}_${element}_stage1.png`;
  const record=manifest.filter(r=>r.file===name);
  assert.equal(record.length,1,`${name} appears exactly once`);
  const path=starter({species_key:species,element_key:element});
  assert.equal(path,`assets/starters-v1/${name}`);
  const source=await readFile(new URL(`assets/starters-v1/${name}`,root));
  const shipped=await readFile(new URL(`anna/bundle/${path}`,root));
  assert.deepEqual(shipped,source,name);
  assert.equal(createHash('sha256').update(source).digest('hex'),record[0].sha256);
  assert.equal(source.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});

test('the app bundles only baby artwork, never fixed evolution portraits',async()=>{
 const {readdir}=await import('node:fs/promises');
 const files=await readdir(new URL('../bundle/assets/',import.meta.url),{recursive:true});
 const png=files.filter(f=>f.endsWith('.png'));
 assert.equal(png.length,72);
 assert.ok(png.every(f=>f.endsWith('_stage1.png')));
});
