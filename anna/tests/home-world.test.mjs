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
