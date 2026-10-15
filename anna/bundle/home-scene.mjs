// Separate 2D objects, not a generated room picture. No network/AI during motion.
import {clearWhiteBorder} from './pixel-pet.mjs';
const IDS=['nest','bookshelf','desk','lamp','side-table','rug','cushion','plant','wall-art','curtain','tea','basket'];
const SIZE={nest:180,bookshelf:140,desk:155,lamp:48,'side-table':92,rug:270,cushion:85,plant:92,'wall-art':65,curtain:145,tea:65,basket:90};
const project=([x,y])=>[450+(x-y)*42,150+(x+y)*22];
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export function routeAt(route,t){if(!route?.length)return [4,6];const f=Math.min(.999999,Math.max(0,t))*(route.length-1),i=Math.floor(f);return lerp(route[i],route[Math.min(i+1,route.length-1)],f-i);}
export function createHomeScene(canvas){
 const c=canvas.getContext('2d');canvas.width=1000;canvas.height=680;
 let sheet=null,crops={},pet=null,home=null,frame=0,active=false,started=0,job=null,ticket=0,petSource='';
 const ready=Promise.all([new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Furniture unavailable'));img.src=new URL('./assets/home-v1/furniture-atlas.png',import.meta.url).href;}),fetch(new URL('./assets/home-v1/atlas.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Furniture unavailable');return r.json();})]).then(([img,metadata])=>{for(const key of IDS)if(!Array.isArray(metadata[key])||metadata[key].length!==4)throw Error('Invalid furniture atlas');sheet=img;crops=metadata;});
 function polygon(points,fill,stroke='#886e51'){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
 function room(){
  c.fillStyle='#eee3cd';c.fillRect(0,0,1000,680);const a=project([0,0]),b=project([10,0]),d=project([0,8]),e=project([10,8]);
  polygon([[a[0],a[1]-135],[b[0],b[1]-135],b,a],'#f5e5c9');polygon([[a[0],a[1]-135],[d[0],d[1]-135],d,a],'#e5d0ac');
  polygon([a,b,e,d],'#c99c69');
  c.save();polygon([a,b,e,d],'#dcb580',null);c.clip();
  for(let y=0;y<8;y++){const p=project([0,y]),q=project([10,y]);c.strokeStyle='#b58b5d88';c.lineWidth=1;c.beginPath();c.moveTo(...p);c.lineTo(...q);c.stroke();
   for(let x=(y%2)*1.5;x<10;x+=3){const v=project([x,y]),z=project([x,y+1]);c.beginPath();c.moveTo(...v);c.lineTo(...z);c.stroke();}}
  const light=c.createRadialGradient(620,300,10,530,310,450);light.addColorStop(0,'#fff9d13d');light.addColorStop(1,'#fff8dc00');c.fillStyle=light;c.fillRect(0,0,1000,680);c.restore();
  // An open entry strip on the front edge; no furniture can block this staging area.
  polygon([project([4,7.2]),project([6,7.2]),project([6,8]),project([4,8])],'#b59c70',null);
  const win=project([5,0]);c.fillStyle='#b2cdd0';c.fillRect(win[0]-42,win[1]-118,72,75);c.strokeStyle='#8b7050';c.lineWidth=6;c.strokeRect(win[0]-42,win[1]-118,72,75);c.lineWidth=3;c.beginPath();c.moveTo(win[0]-6,win[1]-118);c.lineTo(win[0]-6,win[1]-43);c.moveTo(win[0]-42,win[1]-81);c.lineTo(win[0]+30,win[1]-81);c.stroke();
 }
 function furniture(key,pos,alpha=1,carry=false){if(!sheet||!crops[key])return;const source=crops[key],w=carry?Math.min(SIZE[key]||90,85):SIZE[key]||90,h=w*source[3]/source[2],layer=home.catalog.find(v=>v.id===key)?.layer;const point=carry?pos:project([pos[0]+.7,pos[1]+.7]);
  let lift=carry?0:layer==='wall'?90:layer==='surface'?70:0;c.save();c.globalAlpha=alpha;c.drawImage(sheet,...source,point[0]-w/2,point[1]-h-lift,w,h);c.restore();}
 function character(position,time,walking,carried){const p=project([position[0]+1,position[1]+1]),bob=walking?Math.sin(time/110)*3:Math.sin(time/800)*1.5;
  c.save();c.fillStyle='#392b252d';c.beginPath();c.ellipse(p[0],p[1]+3,42,13,0,0,Math.PI*2);c.fill();
  if(pet){const ratio=pet.height/pet.width,w=148,h=w*ratio;c.translate(p[0],p[1]-h/2+bob);c.rotate(walking?Math.sin(time/180)*.025:0);c.drawImage(pet,-w/2,-h/2,w,h);}else{c.fillStyle='#65825b';c.beginPath();c.ellipse(p[0],p[1]-38,32,40,0,0,Math.PI*2);c.fill();}c.restore();
  if(carried){const q=[p[0]-62,p[1]-55+Math.sin(time/170)*3];furniture(carried,q,1,true);c.strokeStyle='#8ad6e8';c.lineWidth=2;c.beginPath();c.ellipse(q[0],q[1]+5,40,12,0,0,Math.PI*2);c.stroke();for(let i=0;i<5;i++){const a=time/600+i*1.26;c.fillStyle='#b9eff8';c.fillRect(q[0]+Math.cos(a)*44,q[1]-30+Math.sin(a)*25,3,3);}}
 }
 function tick(now){if(!active)return;room();const layout=structuredClone(job?job.layout:home?.layout??{});let pos=[4,6],walking=false,carried=null;
  if(job){const leg=job.legs[job.index];if(leg){const elapsed=now-job.at,t=Math.min(1,elapsed/leg.duration);pos=routeAt(leg.route,t);walking=t<1;carried=leg.carry;
    if(t>=1){leg.finish?.();job.index++;job.at=now;if(job.index>=job.legs.length){job=null;}}}else job=null;
  }else if(home?.roam?.length){const t=(now-started)%24000/24000;if(t<.35){pos=routeAt(home.roam,t/.35);walking=true;}else if(t<.7)pos=home.roam.at(-1);else{pos=routeAt([...home.roam].reverse(),(t-.7)/.3);walking=true;}}
  const sorted=Object.entries(layout).sort((a,b)=>{const layer=k=>home.catalog.find(x=>x.id===k)?.layer;return (layer(a[0])==='rug'?-100:layer(a[0])==='wall'?-50:a[1][0]+a[1][1])-(layer(b[0])==='rug'?-100:layer(b[0])==='wall'?-50:b[1][0]+b[1][1]);});
  let drawn=false;for(const [k,p] of sorted){if(!drawn&&home.catalog.find(x=>x.id===k)?.layer==='floor'&&p[0]+p[1]>pos[0]+pos[1]+1){character(pos,now,walking,carried);drawn=true;}furniture(k,p);}if(!drawn)character(pos,now,walking,carried);
  frame=requestAnimationFrame(tick);
 }
 ready.catch(()=>{});
 return {
  ready,
  async set(value,source){home=value;job=null;if(!active){active=true;started=performance.now();frame=requestAnimationFrame(tick);}if(source&&(source!==petSource||!pet)){petSource=source;const id=++ticket;try{const response=await fetch(source,{cache:'no-store'});if(!response.ok)throw Error();const bitmap=await createImageBitmap(await response.blob()),b=document.createElement('canvas');b.width=b.height=256;const ctx=b.getContext('2d');ctx.drawImage(bitmap,0,0,256,256);bitmap.close();const image=ctx.getImageData(0,0,256,256);clearWhiteBorder(image.data,256,256);ctx.putImageData(image,0,0);if(id===ticket)pet=b;}catch{if(id===ticket)pet=null;}}},
  play(value){home=value;if(matchMedia('(prefers-reduced-motion: reduce)').matches||!value.motion?.length){job=null;return;}const work=structuredClone(value.previous??value.layout);const state={layout:work,legs:[],index:0,at:performance.now()};for(const step of value.motion){const key=step.item,route=step.route;
    if(step.phase==='store'){state.legs.push({route:[...route].reverse(),duration:900,finish:()=>{delete work[key];}});state.legs.push({route,carry:key,duration:1200});}
    else{state.legs.push({route,carry:key,duration:1400,finish:()=>{work[key]=value.layout[key];}});state.legs.push({route:[...route].reverse(),duration:700});}}
   // Decorative layers install without blocking a character path.
   for(const [key,p] of Object.entries(value.layout))if(!value.motion.some(x=>x.item===key))work[key]=p;job=state;},
  skip(){job=null;},stop(){active=false;cancelAnimationFrame(frame);job=null;ticket++;},
  thumb(key){if(!sheet)return null;const crop=crops[key],b=document.createElement('canvas');b.width=b.height=160;const ctx=b.getContext('2d'),s=Math.min(144/crop[2],144/crop[3]);ctx.drawImage(sheet,...crop,(160-crop[2]*s)/2,(160-crop[3]*s)/2,crop[2]*s,crop[3]*s);return b.toDataURL('image/png');}
 };
}
