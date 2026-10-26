import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
async function setup(present,fail=false){
  const elements=new Map(),calls=[];
  const document={getElementById(id){if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,disabled:false});return elements.get(id);}};
  globalThis.window=new EventTarget();
  globalThis.__verifyFixture={state:{ready:false,textModelPresent:present},call:async action=>{calls.push(action);if(fail)throw Error('verification failed');globalThis.__verifyFixture.state.ready=true;},status:async()=>globalThis.__verifyFixture.state};
  const raw=await readFile(new URL('../../android/game/ai-settings.js',import.meta.url),'utf8');
  const source=raw.replace("import {call,state,status} from './native.js';","const {call,state,status}=globalThis.__verifyFixture;");
  const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+crypto.randomUUID());
  module.createAISettings(document);return {elements,calls};
}
test('existing model offers explicit offline verification and never download',async()=>{
  const {elements,calls}=await setup(true);
  assert.equal(elements.get('native-download').hidden,true);assert.equal(elements.get('native-verify').hidden,false);
  await elements.get('native-verify').onclick();assert.deepEqual(calls,['verifyModel']);
});
test('failed offline verification never falls back to download',async()=>{
  const {elements,calls}=await setup(true,true);
  await elements.get('native-verify').onclick();assert.deepEqual(calls,['verifyModel']);
  assert.equal(elements.get('native-error').textContent,'verification failed');assert.equal(elements.get('native-download').hidden,true);
});
test('missing model does not auto-start either operation',async()=>{
  const {elements,calls}=await setup(false);
  assert.equal(elements.get('native-verify').hidden,true);assert.equal(elements.get('native-download').hidden,false);assert.deepEqual(calls,[]);
});
