import test from 'node:test';
import assert from 'node:assert/strict';
// Archived 6066cad controller regression only; it is no longer packaged in Android.
import {readFile} from 'node:fs/promises';
const legacy=(await readFile(new URL('../../android/game/local-image-birth.mjs',import.meta.url),'utf8')).replace("'./birth-art.mjs'",JSON.stringify(new URL('../../anna/bundle/birth-art.mjs',import.meta.url).href));
const {birthArtwork,createBirthGeneration,localBirthPrompt}=await import('data:text/javascript;base64,'+Buffer.from(legacy).toString('base64'));
const original=new Blob(['original'],{type:'image/png'}),generated=new Blob(['new pixels'],{type:'image/png'});
const assessment={features:'Blue legless snake, no ears, a red diamond on the left side.',species:'reptile',element:'water',confidence:'clear'};
const options={analyze:async()=>assessment,encode:async()=>'',decode:async()=>generated,generate:async()=>({image:'ok'})};
const tick=()=>new Promise(r=>setTimeout(r,0));

test('original and generated remain separate with the validated observations',async()=>{
  const art=await birthArtwork(original,generated,{pet_id:'pet'},'pet/portrait',assessment);
  assert.equal(art.files['portraits/pet/original.png'],original);assert.equal(art.files['portraits/pet/generated.png'],generated);
  assert.notEqual(art.art['pet/portrait'].hash,art.art['pet/birth-source'].hash);assert.equal(art.art['pet/birth-source'].features,assessment.features);
  await assert.rejects(()=>birthArtwork(original,original,{pet_id:'pet'},'pet/portrait'));
});
test('cancel and duplicate clicks cannot accept a late generated result',async()=>{
  let finish,calls=0;const flow=createBirthGeneration({...options,generate:()=>{calls++;return new Promise(r=>finish=r)}});
  await flow.select(original);const work=flow.run();while(!finish)await tick();
  assert.equal(await flow.run(),false);assert.equal(calls,1);flow.cancel();finish({image:'result'});await assert.rejects(work);
  assert.equal(flow.snapshot().result,null);assert.equal(flow.snapshot().original,original);assert.equal(flow.snapshot().busy,false);
});
test('analysis failure and rejected/invalid contracts never start generation',async()=>{
  for(const analyze of [async()=>{throw Error('analysis failed')},async()=>({...assessment,species:'person'}),async()=>({...assessment,decision:'reject'})]){
    let calls=0;const flow=createBirthGeneration({...options,analyze,generate:async()=>{calls++;return {image:'ok'}}});
    await flow.select(original);await assert.rejects(flow.run());assert.equal(calls,0);assert.equal(flow.snapshot().original,original);
  }
});
test('uncertain assessment requires explicit confirmation before generation',async()=>{
  let calls=0,analyses=0;const flow=createBirthGeneration({...options,analyze:async()=>{analyses++;return {...assessment,confidence:'uncertain'}},generate:async()=>{calls++;return {image:'ok'}}});
  await flow.select(original);assert.equal((await flow.run()).needsConfirmation,true);await flow.run();assert.equal(calls,0);
  await flow.confirm();await flow.run();assert.equal(calls,1);assert.equal(analyses,1);
});
test('restored preview and save-only retry never repeat analysis or generation',async()=>{
  let saved,fail=false,calls=0;const flow=createBirthGeneration({...options,generate:async()=>{calls++;fail=true;return {image:'ok'}},persist:async value=>{if(fail)throw Error('quota');saved=structuredClone(value)}});
  await flow.select(original);await assert.rejects(flow.run());assert.equal(flow.snapshot().result,generated);
  fail=false;await flow.retrySave();assert.equal(calls,1);
  const restored=createBirthGeneration({...options,analyze:()=>{throw Error('unexpected AI')},generate:()=>{throw Error('unexpected AI')}});
  await restored.restore(saved);await restored.run();assert.equal(await restored.snapshot().result.text(),'new pixels');
});
test('analysis cancellation and input lock preserve the selected reference',async()=>{
  let finish;const flow=createBirthGeneration({...options,analyze:()=>new Promise(r=>finish=r)});
  await flow.select(original);const work=flow.run();while(!finish)await tick();
  await assert.rejects(flow.select(new Blob(['other'])));flow.cancel();finish(assessment);await assert.rejects(work);assert.equal(flow.snapshot().assessment,null);
});
test('prompt preserves specific features, human/crop/limb policy and has no monster override',()=>{
  const p=localBirthPrompt(assessment);assert(p.includes(assessment.features));assert.match(p,/Human references stay human/);assert.match(p,/cropped framing/);assert.match(p,/absent limbs absent/);assert.doesNotMatch(p,/full body|fantasy monster/);
});
