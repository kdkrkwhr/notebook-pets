import assert from 'node:assert/strict';
import test from 'node:test';
import {rasterMatches} from './android-render-pixels.mjs';

const observed = {sameDimensions: true, differentPixels: 5, maxChannelDelta: 5};
test('recorded native select edge variation is bounded', () => {
  assert(rasterMatches(observed));
  assert(rasterMatches({...observed, differentPixels: 0, maxChannelDelta: 0}));
});
test('dimension, pixel-count and color changes still fail', () => {
  assert.equal(rasterMatches({...observed, sameDimensions: false}), false);
  assert.equal(rasterMatches({...observed, differentPixels: 9}), false);
  assert.equal(rasterMatches({...observed, maxChannelDelta: 6}), false);
  assert.equal(rasterMatches({...observed, differentPixels: 1, maxChannelDelta: 255}), false);
});
