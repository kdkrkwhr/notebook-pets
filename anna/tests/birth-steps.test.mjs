import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBirthStep} from '../bundle/birth-steps.mjs';

test('the step indicator follows the start form without changing it',()=>{
  assert.equal(currentBirthStep({mode:'random',artReady:false,name:''}),'name');
  assert.equal(currentBirthStep({mode:'random',artReady:false,name:'  '}),'name');
  assert.equal(currentBirthStep({mode:'random',artReady:false,name:'Mori'}),'meet');
  assert.equal(currentBirthStep({mode:'art',artReady:false,name:'Mori'}),'mode');
  assert.equal(currentBirthStep({mode:'art',artReady:true,name:''}),'name');
  assert.equal(currentBirthStep({mode:'art',artReady:true,name:'Mori'}),'meet');
});
