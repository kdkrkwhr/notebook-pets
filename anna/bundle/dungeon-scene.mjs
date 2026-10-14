import {WORLD,THEMES,layout,worldPoint,routePoint,paintRoom} from './dungeon-map.mjs';
import {drawEnemy} from './dungeon-enemies.mjs';
import {drawAvatar,facing,turnToward} from './dungeon-avatar.mjs';
import {pixelCanvas} from './pixel-pet.mjs';
import {journey,WALK_MS,ROUND_MS,EXIT_MS,REST_MS,totalDuration} from './dungeon-journey.mjs';
export {WORLD,WALK_MS,ROUND_MS};
export const routePosition=progress=>routePoint(progress);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cameraAt(point,width,height){
 const zoom=width<500?.8:1.15,vw=width/zoom,vh=height/zoom;
 return {zoom,x:clamp(point[0]+60,vw/2,WORLD.width-vw/2),y:clamp(point[1]-45,vh/2,WORLD.height-vh/2)};
}
const assets=new Map();
function asset(key){if(!assets.has(key))assets.set(key,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{assets.delete(key);reject(Error('Dungeon art unavailable'));};img.src=new URL(`./assets/dungeons-v2/${key}.png`,import.meta.url).href;}));return assets.get(key);}
export function paintDungeon(canvas,key){
 canvas.width=480;canvas.height=270;const c=canvas.getContext('2d');c.fillStyle=THEMES[key].void;c.fillRect(0,0,480,270);
 asset(key).then(img=>{if(canvas.isConnected){c.drawImage(img,110,230,1340,754,0,0,480,270);canvas.dataset.art='ready';}}).catch(()=>{canvas.dataset.art='failed';});
}
export function createDungeonScene(canvas,explorer){
 const c=canvas.getContext('2d');let key='hellgate',atlas=null,ready=false,generation=0,portrait=null,terrain=null,terrainKey='',turn=1,turnAt=null;
 async function loadPortrait(sources){
  for(const src of new Set(sources.filter(Boolean))){
   // The home screen already shows these signed URLs without CORS; a cached copy fails a CORS read.
   try{const response=await fetch(src,{cache:'no-store'});if(!response.ok)throw Error('Portrait unavailable');const bitmap=await createImageBitmap(await response.blob());try{return pixelCanvas(bitmap);}finally{bitmap.close();}}
   catch{/* Try only another image of this same companion. */}
  }
  throw Error('Companion portrait unavailable');
 }
 const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
 function enemy(kind,x,y,beat,active,dead,reduced,direction,elapsed){
  c.save();if(dead)c.globalAlpha=.2;ellipse(x,y,28,10,'#0008');
  if(kind==='guardian'){
   const row=active?(beat<.45?1:beat<.7?2:0):0,col=['hellgate','icekingdom','dreamforest'].indexOf(key),w=atlas.width/3,h=atlas.height/3;
   c.drawImage(atlas,col*w,row*h,w,h,x-92-(active&&beat>.45&&beat<.7?12:0),y-122,184,125);
  }else{
   drawEnemy(c,x,y,{kind,region:key,elapsed,beat,active,reduced,direction});
  }c.restore();
 }
 return {
  async load(region,identity={}){
   const ticket=++generation;ready=false;portrait=null;key=region;turnAt=null;explorer.hidden=true;canvas.dataset.art='loading';c.clearRect(0,0,canvas.width,canvas.height);
   const sources=[explorer.src,identity.fallback];
   try{const [original,currentPortrait]=await Promise.all([asset('guardians'),loadPortrait(sources)]);if(ticket!==generation)return false;atlas=document.createElement('canvas');atlas.width=252;atlas.height=168;atlas.getContext('2d').drawImage(original,0,0,252,168);portrait=currentPortrait;ready=true;canvas.dataset.art='ready';return true;}
   catch{if(ticket===generation)canvas.dataset.art='failed';return false;}
  },
  clear(){++generation;ready=false;portrait=null;explorer.removeAttribute('src');c.clearRect(0,0,canvas.width,canvas.height);canvas.dataset.art='empty';},
  draw({elapsed=0,run=null,finished=false,reduced=false}={}){
   if(!ready)return;
   // The decoded portrait belongs to this load only; late/failed loads cannot reuse another pet.
   explorer.hidden=true;
   const width=Math.max(1,Math.round(canvas.clientWidth)),height=Math.max(1,Math.round(canvas.clientHeight));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   const state=run?journey(run,finished?totalDuration(run):elapsed,finished):{room:{kind:'battle',enemy:'slime'},index:0,total:3,phase:'preview',time:0,beat:0};
   const {room,index,phase,time,beat}=state,exit=phase==='exit',progress=exit?(time-WALK_MS-(room.kind==='rest'?REST_MS:room.combat.turns.length*ROUND_MS))/EXIT_MS:phase==='travel'?time/WALK_MS:phase==='preview'?0:1;
   const path=p=>routePoint(p,index,exit,run?.choice||'safe',run?.pending?'approach':run?.format==='stage-v1'?'branch':'full');
   const hero=path(progress),ahead=path(Math.min(1,progress+.01)),previous=path(Math.max(0,progress-.01));
   const walking=phase==='travel'||exit,direction=walking?facing(ahead[0]-previous[0],ahead[1]-previous[1]):index%2?'left':'right';
   const map=layout(index),boss=worldPoint(map.enemy),battle=phase==='battle',impact=battle&&beat>.45&&beat<.66;
   const camera=cameraAt(hero,width,height),zoom=camera.zoom;
   c.setTransform(1,0,0,1,0,0);c.fillStyle=THEMES[key].void;c.fillRect(0,0,width,height);c.save();c.translate(width/2-camera.x*zoom,height/2-camera.y*zoom);c.scale(zoom,zoom);c.imageSmoothingEnabled=false;
   const unlocked=exit||finished&&run?.outcome==='win',cacheKey=`${key}/${index}/${unlocked}`;
   if(cacheKey!==terrainKey){terrain=document.createElement('canvas');terrain.width=WORLD.width;terrain.height=WORLD.height;paintRoom(terrain.getContext('2d'),key,index,unlocked);terrainKey=cacheKey;}
   c.drawImage(terrain,0,0);
   if(room.kind==='rest'){
    ellipse(boss[0],boss[1],34,17,'#b8efbf55');c.fillStyle='#789f87';c.fillRect(boss[0]-22,boss[1]-23,44,24);c.fillStyle='#c9f6d7';c.fillRect(boss[0]-5,boss[1]-43,10,28);c.fillRect(boss[0]-14,boss[1]-34,28,9);
   }else enemy(room.enemy,boss[0],boss[1],beat,battle,exit||finished&&state.room.combat?.hp_enemy<=0,reduced,index%2?'right':'left',elapsed);
   if(battle&&beat<.45)ellipse(hero[0],hero[1],30+beat*30,14+beat*10,'#ff7c5555');
   let hx=hero[0],hy=hero[1];if(impact&&state.frame?.dodged_me&&!reduced)hy+=Math.sin((beat-.45)/.21*Math.PI)*25;
   const frame=walking&&!reduced?Math.floor(elapsed/140)%4:0;
   turn=turnToward(turn,direction,reduced||turnAt===null?Infinity:elapsed-turnAt);turnAt=elapsed;
   drawAvatar(c,hx,hy,{portrait,direction,frame,walking:walking&&!reduced,turn,scale:2.1,hit:impact&&!state.frame?.dodged_me,fallen:finished&&run?.hp_me<=0});
   if(battle&&beat>.65&&beat<.9){c.strokeStyle='#ffedbd';c.lineWidth=4;c.beginPath();c.moveTo(hx+12,hy-35);c.lineTo(boss[0]-10,boss[1]-25);c.stroke();}
   if(battle&&beat>.55){
    const prev=state.turn?room.combat.turns[state.turn-1]:{hp_me:room.start_hp,hp_enemy:room.combat.max_hp_enemy};
    c.font='bold 20px monospace';c.textAlign='center';c.fillStyle='#ffbfa6';c.fillText(state.frame?.dodged_me?'↗':`−${Math.max(0,Math.round(prev.hp_me-state.frame.hp_me))}`,hx,hy-88-(beat-.55)*25);
    if(beat>.75){c.fillStyle='#ffedb0';c.fillText(`−${Math.max(0,Math.round(prev.hp_enemy-state.frame.hp_enemy))}`,boss[0],boss[1]-110);}
   }
   c.restore();
   if(index>0&&phase==='travel'&&time<450&&!reduced){c.fillStyle=`rgba(8,15,22,${1-time/450})`;c.fillRect(0,0,width,height);}
   // Map and room chain reveal the next destination, not just a floating character.
   const mw=110,mh=82,mx=width-mw-15,my=15;c.fillStyle='#08121dda';c.fillRect(mx-5,my-5,mw+10,mh+10);
   c.fillStyle=THEMES[key].tile;for(const cell of map.floor){const [x,y]=cell.split(',').map(Number);c.fillRect(mx+x/48*mw,my+y/36*mh,mw/48+1,mh/36+1);}
   c.fillStyle='#ffe6ad';c.fillRect(mx+hero[0]/WORLD.width*mw-2,my+hero[1]/WORLD.height*mh-2,4,4);
   c.fillStyle=unlocked?'#b4edb4':'#de9a8e';const door=worldPoint(map.exit);c.fillRect(mx+door[0]/WORLD.width*mw-2,my+door[1]/WORLD.height*mh-2,4,4);
   const count=state.total,gap=16,start=mx+mw/2-(count-1)*gap/2;
   for(let i=0;i<count;i++){c.fillStyle=i<index?'#9bb897':i===index?'#ffdb91':'#33464c';c.fillRect(start+i*gap-4,my+mh+12,8,8);}
   canvas.dataset.camera=`${camera.x.toFixed(1)},${camera.y.toFixed(1)}`;canvas.dataset.phase=finished?'finished':phase;canvas.dataset.room=String(index+1);canvas.dataset.enemy=room.enemy||'none';canvas.dataset.direction=direction;canvas.dataset.walkFrame=String(frame);canvas.dataset.turn=turn.toFixed(2);
  }
 };
}
