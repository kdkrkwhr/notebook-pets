import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHomeWalk} from '../bundle/home-walk.mjs';
test('the real Python home routes animate four directions and cross the doorway without entering props',()=>{
 const p=spawnSync(process.env.PYTHON??'python',['-B','-X','utf8','anna/executas/notebuddy/game_worker.py'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),input:JSON.stringify({command:'start',name:'World test',request_id:'world-birth'}),encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);const world=JSON.parse(p.stdout).view.home.world,walk=createHomeWalk(world),s=walk.state,seen=new Set(),directions=new Set(),frames=new Set();
 for(let i=0;i<12000;i++){
  walk.advance(1/30);seen.add(s.scene);directions.add(s.direction);frames.add(s.frame);
  if(s.scene==='yard')for(const {block:b} of world.yard.objects)if(b)assert(s.x+10<=b[0]+.001||s.x-10>=b[0]+b[2]-.001||s.y+4<=b[1]+.001||s.y-4>=b[1]+b[3]-.001,'body crosses an obstacle');
 }
 assert.equal(seen.size,2);assert.equal(directions.size,4);assert.equal(frames.size,4);
 s.paused=true;const before=structuredClone(s);walk.advance(10);assert.deepEqual(s,before);
});

test('activity starts only after arrival, survives pause, and clears for movement, scene changes and transport',()=>{
 const world={yard:{start:[320,208],tour:[{route:[[320,208]],pause:1,next:'inside'}]},inside:{start:[224,288],tour:[
  {route:[[224,288],[224,256]],activity:'read',item:'bookshelf',pause:2,face:'up'},
  {route:[[224,256],[224,288]],pause:.4,face:'down',next:'yard'}]}};
 const walk=createHomeWalk(world),s=walk.state;walk.jump('inside');
 assert.equal(s.activity,null);walk.advance(.05);assert.equal(s.activity,null);
 for(let i=0;i<100&&!s.activity;i++)walk.advance(.05);
 assert.equal(s.activity,'read');assert.equal(s.walking,false);assert.equal(s.y,256);assert.equal(s.direction,'up');
 s.paused=true;const paused=structuredClone(s);walk.advance(100);assert.deepEqual(s,paused);
 s.paused=false;for(let i=0;i<50&&s.activity;i++)walk.advance(.05);
 assert.equal(s.activity,null);walk.advance(.05);assert.equal(s.walking,true);
 walk.jump('inside');assert.equal(s.activity,null);
 for(let i=0;i<100&&!s.activity;i++)walk.advance(.05);assert.equal(s.activity,'read');
 walk.play([{route:[[224,256]],carry:'bookshelf',activity:'read',pause:2}],()=>{});
 walk.advance(.05);assert.equal(s.activity,null,'transport never acquires a furniture activity');
 walk.stopJob();assert.equal(s.activity,null);walk.jump('yard');assert.equal(s.activity,null);
});
