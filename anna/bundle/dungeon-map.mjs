export const TILE=48,WORLD={width:2304,height:1728};
export const THEMES={hellgate:{floor:'#634b43',tile:'#73584b',wall:'#362c32',edge:'#b87957',glow:'#ffab63',void:'#1e171e'},icekingdom:{floor:'#416278',tile:'#54798e',wall:'#233849',edge:'#8fbbc7',glow:'#b3edff',void:'#121f32'},dreamforest:{floor:'#485b54',tile:'#596c5f',wall:'#293d39',edge:'#8da082',glow:'#d6bcff',void:'#171e2b'}};
const maps=new Map();
export function layout(index=0,choice='safe'){
 const cacheKey=`${index%4}/${choice}`;if(maps.has(cacheKey))return maps.get(cacheKey);
 const transform=([x,y])=>[index%2?47-x:x,index%4>=2?35-y:y];
 const approach=[[4,30],[4,24],[12,24]],safe=[[12,24],[12,30],[24,30],[24,20],[32,20],[32,12],[38,12]],risk=[[12,24],[12,16],[22,16],[22,12],[38,12]],exit=[[38,12],[42,12],[42,5],[44,5]];
 const floor=new Set(),add=(x,y)=>floor.add(transform([x,y]).join(','));
 const box=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)add(xx,yy);};
 for(const room of [[2,27,6,6],[9,21,7,6],[20,27,8,6],[20,17,7,7],[29,17,7,7],[9,13,7,6],[19,9,7,7],[35,9,10,7],[40,2,7,6]])box(...room);
 for(const path of [approach,safe,risk,exit,[[24,30],[32,30],[32,20]],[[4,24],[4,15],[12,15]]]){
  for(let i=1;i<path.length;i++){let [x,y]=path[i-1], [tx,ty]=path[i];while(true){box(x-1,y-1,3,3);if(x===tx&&y===ty)break;if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);}}
 }
 const result={route:[...approach,...(choice==='risk'?risk:safe).slice(1),...exit.slice(1)].map(transform),approach:approach.map(transform),branch:(choice==='risk'?risk:safe).map(transform),out:exit.map(transform),floor,enemy:transform([40,12]),entry:transform(approach[0]),exit:transform(exit.at(-1)),checkpoint:transform([12,24]),traps:[[12,20],[22,14],[30,12]].map(transform),transform};
 maps.set(cacheKey,result);return result;
}
export const worldPoint=p=>[(p[0]+.5)*TILE,(p[1]+.5)*TILE];
export function routePoint(progress,index=0,exit=false,choice='safe',segment='full'){
 const map=layout(index,choice),points=(exit?map.out:segment==='approach'?map.approach:segment==='branch'?map.branch:[...map.approach,...map.branch.slice(1)]).map(worldPoint);
 let distance=Math.max(0,Math.min(1,progress))*points.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=length)return [a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length];distance-=length;}
 return points.at(-1);
}
export function paintRoom(c,key,index,unlocked=false){
 const t=THEMES[key],map=layout(index);c.fillStyle=t.void;c.fillRect(0,0,WORLD.width,WORLD.height);
 // Every visible corridor tile is also the authoritative walking surface.
 for(const cell of map.floor){const [x,y]=cell.split(',').map(Number),px=x*TILE,py=y*TILE;
  c.fillStyle=(x*7+y*3+index)%4===0?t.tile:t.floor;c.fillRect(px,py,TILE,TILE);
  c.fillStyle='#0002';c.fillRect(px,py+TILE-2,TILE,2);c.fillRect(px+TILE-2,py,2,TILE);
  c.fillStyle='#ffffff0c';c.fillRect(px+4,py+3,TILE-8,2);
  // Deterministic worn tiles and fragments add texture without blocking travel.
  if((x*13+y*7)%9===0){c.strokeStyle='#0003';c.lineWidth=2;c.beginPath();c.moveTo(px+8,py+8);c.lineTo(px+19,py+18);c.lineTo(px+14,py+29);c.stroke();}
  if((x*3+y*11)%17===0){c.fillStyle=t.edge+'55';c.fillRect(px+28,py+28,7,4);c.fillRect(px+19,py+34,4,3);}
  if(!map.floor.has(`${x},${y-1}`)){c.fillStyle=t.wall;c.fillRect(px,py-25,TILE,27);c.fillStyle=t.edge;c.fillRect(px,py-25,TILE,4);c.fillStyle='#0005';c.fillRect(px+TILE-2,py-20,2,22);}
  if(!map.floor.has(`${x+1},${y}`)){c.fillStyle=t.wall;c.fillRect(px+TILE-7,py-15,7,TILE+15);}
  if(!map.floor.has(`${x-1},${y}`)){c.fillStyle=t.wall;c.fillRect(px,py-15,7,TILE+15);}
  if(!map.floor.has(`${x},${y+1}`)){c.fillStyle=t.wall;c.fillRect(px,py+TILE-7,TILE,12);c.fillStyle=t.edge;c.fillRect(px,py+TILE-7,TILE,3);}
 }
 // Border props never occupy the walking route.
 for(const [x,y] of [[2,28],[14,22],[21,28],[25,18],[34,18],[10,14],[20,10],[36,10],[45,3]]){
  const [xx,yy]=map.transform([x,y]),px=xx*TILE+24,py=yy*TILE+24;c.fillStyle='#0005';c.fillRect(px-15,py+2,30,9);
  c.fillStyle=t.wall;c.fillRect(px-10,py-28,20,34);c.fillStyle=t.edge;c.fillRect(px-13,py-30,26,7);
  c.fillStyle=t.glow;c.fillRect(px-4,py-41,8,11);c.fillStyle='#fff2c7';c.fillRect(px-2,py-39,4,6);
 }
 for(const [point,open] of [[map.entry,true],[map.exit,unlocked]]){
  const [x,y]=worldPoint(point);c.fillStyle=t.wall;c.fillRect(x-33,y-42,66,57);c.fillStyle=t.edge;c.fillRect(x-35,y-44,70,8);c.fillRect(x-35,y-40,8,58);c.fillRect(x+27,y-40,8,58);
  c.fillStyle=open?t.glow:'#241f29';c.globalAlpha=open?.65:1;c.fillRect(x-24,y-35,48,50);c.globalAlpha=1;
  if(!open){c.fillStyle=t.edge;for(let j=-18;j<24;j+=12)c.fillRect(x+j,y-35,4,50);}
 }
 for(const point of map.traps){const [x,y]=worldPoint(point);c.fillStyle='#291c27';c.fillRect(x-18,y-13,36,26);c.fillStyle='#cba1a1';for(let i=-12;i<=12;i+=12){c.beginPath();c.moveTo(x+i-5,y+6);c.lineTo(x+i,y-8);c.lineTo(x+i+5,y+6);c.fill();}}
 const [sx,sy]=worldPoint(map.checkpoint);c.fillStyle='#846b47';c.fillRect(sx-3,sy-38,6,38);c.fillStyle='#e4c48a';c.fillRect(sx-24,sy-38,48,15);c.fillStyle='#523c34';c.font='16px monospace';c.textAlign='center';c.fillText('← ? →',sx,sy-25);
 return map;
}
