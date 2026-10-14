import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearWhiteBorder,currentPixel,pixelKey,pixelSource} from '../bundle/pixel-pet.mjs';
import {routePosition} from '../bundle/dungeon.mjs';
import {WORLD,cameraAt} from '../bundle/dungeon-scene.mjs';
import {TURN_MS,turnToward} from '../bundle/dungeon-avatar.mjs';

test('dungeon avatar turns through the card edge instead of snapping, and keeps its side on vertical travel',()=>{
  const half=turnToward(1,'left',TURN_MS/2);assert.ok(Math.abs(half)<.01);
  assert.equal(turnToward(half,'left',TURN_MS/2),-1);
  assert.equal(turnToward(-1,'up',50),-1);assert.equal(turnToward(1,'down',50),1);
  assert.equal(turnToward(1,'left',Infinity),-1);assert.equal(turnToward(1,'left',-5),-1);
  let turn=-1;for(let t=0;t<TURN_MS;t+=16)turn=turnToward(turn,'right',16);assert.equal(turn,1);
});

test('pixel background removal preserves enclosed white features and colored edges',()=>{
  const data=new Uint8ClampedArray(5*5*4).fill(255);
  for(let y=1;y<4;y++)for(let x=1;x<4;x++)if(x!==2||y!==2){const i=(y*5+x)*4;data[i]=45;data[i+1]=70;data[i+2]=100;}
  clearWhiteBorder(data,5,5);
  assert.equal(data[3],0);assert.equal(data[(2*5+2)*4+3],255);
  assert.equal(data[(1*5+1)*4+3],255);
  const colored=new Uint8ClampedArray([20,80,120,255]);clearWhiteBorder(colored,1,1);assert.equal(colored[3],255);
});

test('pixel portraits never attach to a different pet, stage or replaced portrait',()=>{
  const view={pet_id:'a',stage:1,species_key:'fairy',element_key:'light'};
  const art={'a/stage-1':{path:'portraits/a/one.png'}};
  const entry={path:'portraits/a/pixel.png',format:'pixel-v1',source_path:pixelSource(view,art)};
  art[pixelKey(view)]=entry;assert.equal(currentPixel(view,art),entry);
  assert.equal(currentPixel({...view,stage:2},art),null);
  assert.equal(currentPixel({...view,pet_id:'b'},art),null);
  art['a/stage-1']={path:'portraits/a/two.png'};assert.equal(currentPixel(view,art),null);
});

test('exploration path remains within the map and clamps replay position',()=>{
  assert.deepEqual(routePosition(-1),routePosition(0));assert.deepEqual(routePosition(2),routePosition(1));
  for(let i=0;i<=100;i++){const [x,y]=routePosition(i/100);assert.ok(x>=0&&x<=WORLD.width&&y>=0&&y<=WORLD.height);const camera=cameraAt([x,y],1000,560);assert.ok(camera.x-500/camera.zoom>=0&&camera.x+500/camera.zoom<=WORLD.width);}
});
