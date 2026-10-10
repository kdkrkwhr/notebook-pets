import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewDecision,ArtworkError,artworkErrorKey,birthPrompt,sourcePath} from '../bundle/birth-art.mjs';

test('art review requires explicit structured approval; failures never default to approval',()=>{
  const response=text=>({content:{text}});
  assert.equal(reviewDecision(response('{"decision":"allow","features":"round ears"}')),'round ears');
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


test('source artwork cannot override the assigned species anatomy',()=>{
 const prompt=birthPrompt({species_key:'mammal',element_key:'fire',image_prompt:'soft fur, rounded ears, paw pads; small flames'},'a metal robot with jointed arms');
 assert.match(prompt,/Authoritative game anatomy and element design: soft fur/);
 assert.match(prompt,/outranks every conflicting source observation/);
 assert.match(prompt,/never a robotic metal shell/);
});
