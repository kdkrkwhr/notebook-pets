import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewDecision,ArtworkError,artworkErrorKey,birthPrompt,artworkGrowthPrompt,sourcePath} from '../bundle/birth-art.mjs';

test('art review requires explicit structured approval; failures never default to approval',()=>{
  const response=text=>({content:{text}});
  assert.deepEqual(reviewDecision(response(JSON.stringify({decision:'allow',features:'round ears',species:'mammal',element:'random',confidence:'clear'}))),{features:'round ears',species:'mammal',element:'random',confidence:'clear'});
  for(const content of ['', 'yes', '{}','{"decision":"allow"}','{"decision":"allow","features":""}'])assert.throws(()=>reviewDecision(response(content)),e=>e.key==='artCheckFailed');
  assert.throws(()=>reviewDecision(response('{"decision":"reject"}')),e=>e.key==='artRejected');
  assert.throws(()=>reviewDecision(response('{"decision":"unclear"}')),e=>e.key==='artUnclear');
  assert.throws(()=>reviewDecision({...response('{"decision":"allow","features":"eyes"}'),stopReason:'contentFilter'}),ArtworkError);
});
test('provider outage and missing vision support are distinct from content refusal',()=>{
  assert.equal(artworkErrorKey(Error('fal.ai HTTP 404 image-to-image')),'artCheckFailed');
  assert.equal(artworkErrorKey({code:'APP_MODEL_NOT_VISION_CAPABLE'}),'artVisionUnavailable');
  assert.equal(artworkErrorKey(Error('Content policy violation')),'artRejected');
});
test('birth prompt preserves server chosen traits and only accepts own portrait paths',()=>{
  const view={pet_id:'own',species_key:'machine',element_key:'light'};
  const prompt=birthPrompt(view,'round eyes');
  assert.match(prompt,/species machine and element light/);assert.match(prompt,/new baby, not an evolution/);
  assert.equal(sourcePath(view,'portraits/own/source.png'),true);
  for(const path of ['portraits/other/source.png','portraits/own/../other.png','portraits/own/%2e.png','https://secret'])assert.equal(sourcePath(view,path),false);
});


test('drawing anatomy outranks category stereotypes at birth and evolution',()=>{
 const view={species_key:'reptile',element_key:'fire',stage:3,image_prompt:'four feet'};
 const prompt=birthPrompt(view,'a long green snake, no legs, blue eyes');
 assert.match(prompt,/snake stays legless/);assert.match(prompt,/long green snake/);assert.doesNotMatch(prompt,/four feet/);
 const growth=artworkGrowthPrompt(view,'a long green snake, no legs, blue eyes');
 assert.match(growth,/mature adult/);assert.match(growth,/never add unrelated anatomy/);assert.match(growth,/no legs/);
});
test('unknown classifications fail closed, absent element cue is explicit random',()=>{
 const base={decision:'allow',features:'snake, no legs',species:'reptile',element:'random',confidence:'clear'};
 for(const bad of [{species:'snake'},{element:'ice'},{confidence:'maybe'},{features:'x'.repeat(1201)}])assert.throws(()=>reviewDecision({content:{text:JSON.stringify({...base,...bad})}}),ArtworkError);
 assert.equal(reviewDecision({content:{text:JSON.stringify(base)}}).element,'random');
});
