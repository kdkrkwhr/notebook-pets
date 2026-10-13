import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layout,routePoint,TILE} from '../bundle/dungeon-map.mjs';
import {journey,totalDuration} from '../bundle/dungeon-journey.mjs';
test('every sampled step stays on visible floor and reaches the exit in all room orientations',()=>{
 for(let room=0;room<6;room++)for(const exit of [false,true]){
  const map=layout(room);
  for(let step=0;step<=1000;step++){
   const [x,y]=routePoint(step/1000,room,exit);assert.ok(map.floor.has(`${Math.floor(x/TILE)},${Math.floor(y/TILE)}`));
  }
  if(exit){const [x,y]=routePoint(1,room,true);assert.deepEqual([Math.floor(x/TILE),Math.floor(y/TILE)],map.exit);}
 }
});
test('timeline retains legacy replay and visits rest then boss without requesting a new outcome',()=>{
 const combat={max_hp_me:12,max_hp_enemy:10,hp_me:8,hp_enemy:0,turns:[{hp_me:8,hp_enemy:0}]};
 assert.equal(journey(combat,0).total,1);
 const run={...combat,room_count:3,rooms:[{kind:'battle',combat,start_hp:12},{kind:'rest',start_hp:8,hp_me:12},{kind:'boss',combat,start_hp:12}]};
 const phases=new Set();for(let t=0;t<totalDuration(run);t+=100)phases.add(journey(run,t).phase);
 assert.ok(phases.has('rest'));assert.ok(phases.has('exit'));assert.equal(journey(run,totalDuration(run)).done,true);assert.equal(journey(run,totalDuration(run),true).index,2);
});
