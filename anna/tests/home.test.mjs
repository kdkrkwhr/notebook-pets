import test from 'node:test';
import assert from 'node:assert/strict';
import {homeDecision} from '../bundle/home.mjs';
import {routeAt} from '../bundle/home-scene.mjs';
test('home AI may select only a supplied candidate and bounded plain narration',()=>{
 const candidates=[{id:'candidate-1'}],reply=value=>({content:{text:JSON.stringify(value)}});
 assert.deepEqual(homeDecision(reply({candidate_id:'candidate-1',reason:'Books by the window.'}),candidates),{candidate_id:'candidate-1',reason:'Books by the window.'});
 for(const value of [{candidate_id:'invented',reason:'x'},{candidate_id:'candidate-1',reason:'x',coins:9999},{candidate_id:'candidate-1',reason:'x'.repeat(181)},{candidate_id:'candidate-1',reason:'\n'}])assert.throws(()=>homeDecision(reply(value),candidates));
});
test('home animation samples only the supplied path without AI',()=>{
 const route=[[4,6],[4,5],[4,4],[5,4]];
 assert.deepEqual(routeAt(route,0),route[0]);
 for(let i=0;i<=100;i++){const [x,y]=routeAt(route,i/100);assert(x>=4&&x<=5);assert(y>=4&&y<=6);assert(x===4||y===4);}
});
