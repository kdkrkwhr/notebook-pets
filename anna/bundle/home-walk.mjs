// Interpolate only routes supplied by the Python core. No pathfinding or AI here.
export const roomPoint=([x,y])=>[64+(x+1)*32,64+(y+1)*32];
export function routeAt(route,t){if(!route?.length)return [4,6];const f=Math.min(.999999,Math.max(0,t))*(route.length-1),i=Math.floor(f),a=route[i],b=route[Math.min(i+1,route.length-1)];return a.map((v,k)=>v+(b[k]-v)*(f-i));}
export function createHomeWalk(world){
 const s={scene:'yard',x:320,y:208,direction:'down',frame:1,walking:false,paused:false,stage:0,path:[],hold:0,distance:0,speed:0,fade:0,transition:null,clock:0,activity:null};let job=null;
 const step=()=>job?job.legs[s.stage]:world[s.scene].tour[s.stage];
 function begin(){const leg=step();s.path=leg.route.slice(1).map(p=>[...p]);s.hold=0;s.activity=null;}
 function jump(scene){job=null;const [x,y]=world[scene].start;Object.assign(s,{scene,x,y,direction:scene==='yard'?'down':'up',frame:1,walking:false,stage:0,hold:0,distance:0,speed:0,transition:null,fade:0});begin();}
 function advance(dt){
  if(s.paused)return;s.clock+=dt;
  if(s.transition){s.fade+=dt*2.5;if(s.fade>=1){jump(s.transition);s.fade=-1;}return;}
  if(s.fade<0){s.fade=Math.min(0,s.fade+dt*2.5);return;}
  const leg=step();
  if(s.path.length){
   const [tx,ty]=s.path[0],dx=tx-s.x,dy=ty-s.y,d=Math.hypot(dx,dy);
   if(d<.001){s.path.shift();return;}
   s.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
   const remaining=s.path.reduce((n,p,i)=>n+Math.hypot(p[0]-(i?s.path[i-1][0]:s.x),p[1]-(i?s.path[i-1][1]:s.y)),0);
   s.speed=Math.min(42,s.speed+dt*140,Math.max(12,remaining*5));const move=Math.min(d,s.speed*dt);
   s.x+=dx/d*move;s.y+=dy/d*move;s.distance+=move;s.walking=true;s.frame=[0,1,2,1][Math.floor(s.distance/6)%4];
   if(move>=d){s.x=tx;s.y=ty;s.path.shift();}
  }else{
   s.walking=false;s.speed=0;s.direction=leg.face??s.direction;s.frame=s.clock%5>4.8?3:1;s.hold+=dt;s.activity=job?null:leg.activity??null;
   if(s.hold>=(leg.pause??.1)){
    leg.finish?.();
    if(job&&s.stage===job.legs.length-1){const finish=job.finish;jump('inside');finish?.();}
    else if(leg.next){s.transition=leg.next;s.activity=null;}
    else{s.stage=(s.stage+1)%(job?job.legs.length:world[s.scene].tour.length);begin();}
   }
  }
 }
 jump('yard');return {state:s,advance,jump,carried:()=>job?step()?.carry:null,
  play(legs,finish){jump('inside');job={legs,finish};s.stage=0;[s.x,s.y]=legs[0].route[0];begin();},
  stopJob(){job=null;jump('inside');}};
}
