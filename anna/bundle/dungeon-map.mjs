export const TILE=48,WORLD={width:1536,height:1152};
export const THEMES={hellgate:{floor:'#634b43',tile:'#73584b',wall:'#362c32',edge:'#b87957',glow:'#ffab63',void:'#1e171e'},icekingdom:{floor:'#416278',tile:'#54798e',wall:'#233849',edge:'#8fbbc7',glow:'#b3edff',void:'#121f32'},dreamforest:{floor:'#485b54',tile:'#596c5f',wall:'#293d39',edge:'#8da082',glow:'#d6bcff',void:'#171e2b'}};
export function layout(index=0){
 const flip=index%2===1;
 const base=[[5,18],[5,14],[11,14],[11,9],[19,9],[23,9],[23,4],[26,4]];
 const transform=([x,y])=>[flip?31-x:x,index%4>=2?23-y:y];
 const route=base.map(transform),floor=new Set();
 const add=(x,y)=>{const p=transform([x,y]);floor.add(p.join(','));};
 const box=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)add(xx,yy);};
 box(2,13,9,8);box(8,6,15,7);box(20,1,10,8);
 for(let i=1;i<base.length;i++){let [x,y]=base[i-1], [tx,ty]=base[i];while(true){box(x-1,y-1,3,3);if(x===tx&&y===ty)break;x+=Math.sign(tx-x);y+=Math.sign(ty-y);}}
 return {route,floor,enemy:transform([21,9]),entry:route[0],exit:route.at(-1),transform};
}
export const worldPoint=p=>[(p[0]+.5)*TILE,(p[1]+.5)*TILE];
export function routePoint(progress,index=0,exit=false){
 const all=layout(index).route,points=(exit?all.slice(4):all.slice(0,5)).map(worldPoint);
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
  if(!map.floor.has(`${x},${y-1}`)){c.fillStyle=t.wall;c.fillRect(px,py-25,TILE,27);c.fillStyle=t.edge;c.fillRect(px,py-25,TILE,4);c.fillStyle='#0005';c.fillRect(px+TILE-2,py-20,2,22);}
  if(!map.floor.has(`${x+1},${y}`)){c.fillStyle=t.wall;c.fillRect(px+TILE-7,py-15,7,TILE+15);}
  if(!map.floor.has(`${x-1},${y}`)){c.fillStyle=t.wall;c.fillRect(px,py-15,7,TILE+15);}
  if(!map.floor.has(`${x},${y+1}`)){c.fillStyle=t.wall;c.fillRect(px,py+TILE-7,TILE,12);c.fillStyle=t.edge;c.fillRect(px,py+TILE-7,TILE,3);}
 }
 // Border props never occupy the walking route.
 for(const [x,y] of [[3,14],[9,18],[9,7],[16,7],[21,11],[21,2],[28,6]]){
  const [xx,yy]=map.transform([x,y]),px=xx*TILE+24,py=yy*TILE+24;c.fillStyle='#0005';c.fillRect(px-15,py+2,30,9);
  c.fillStyle=t.wall;c.fillRect(px-10,py-28,20,34);c.fillStyle=t.edge;c.fillRect(px-13,py-30,26,7);
  c.fillStyle=t.glow;c.fillRect(px-4,py-41,8,11);c.fillStyle='#fff2c7';c.fillRect(px-2,py-39,4,6);
 }
 for(const [point,open] of [[map.entry,true],[map.exit,unlocked]]){
  const [x,y]=worldPoint(point);c.fillStyle=t.wall;c.fillRect(x-33,y-42,66,57);c.fillStyle=t.edge;c.fillRect(x-35,y-44,70,8);c.fillRect(x-35,y-40,8,58);c.fillRect(x+27,y-40,8,58);
  c.fillStyle=open?t.glow:'#241f29';c.globalAlpha=open?.65:1;c.fillRect(x-24,y-35,48,50);c.globalAlpha=1;
  if(!open){c.fillStyle=t.edge;for(let j=-18;j<24;j+=12)c.fillRect(x+j,y-35,4,50);}
 }
 return map;
}
