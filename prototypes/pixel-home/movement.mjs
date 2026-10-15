// Visual study only: no game state, economy, persistence or AI.
// Production integration must get approved geometry/routes from the Python core.
export const OBJECTS = {
  yard: [
    {kind:'house',x:320,y:208,w:160,block:[240,134,160,58]},
    ...[[72,128],[136,216],[528,160],[568,328],[88,392],[448,424]].map(([x,y])=>({kind:'tree',x,y,w:76,block:[x-7,y-13,14,13]})),
    {kind:'bench',x:208,y:304,w:56,block:[180,288,56,16]},
    ...[[200,200],[440,200],[80,304],[464,320],[200,432],[360,432]].map(([x,y])=>({kind:'bush',x,y,w:40,block:[x-15,y-9,30,9]})),
    {kind:'plant',x:256,y:216,w:24,block:[249,206,14,10]},
    {kind:'plant',x:384,y:216,w:24,block:[377,206,14,10]},
  ],
  inside: [
    {kind:'rug',x:224,y:240,w:96},
    {kind:'bookshelf',x:120,y:112,w:44,block:[100,94,40,18]},
    {kind:'desk',x:208,y:144,w:56,block:[180,124,56,20]},
    {kind:'nest',x:328,y:128,w:56,block:[300,106,56,22]},
    {kind:'plant',x:56,y:128,w:24,block:[48,116,16,12]},
    {kind:'plant',x:376,y:240,w:24,block:[368,228,16,12]},
  ],
};
export const DIMENSIONS={yard:[640,480],inside:[448,352]};
export const TOURS={
  yard:[
    {to:[184,176],label:'나무 그늘을 찾아가는 중'},
    {to:[136,192],label:'나무 뒤를 지나가요',pause:.6,face:'left'},
    {to:[96,192],label:'그늘길을 따라 걸어요'},
    {to:[96,240],label:'나무 옆으로 돌아 나와요'},
    {to:[168,240],label:'나무 앞을 지나가요',pause:1,face:'down'},
    {to:[208,320],label:'벤치 옆에서 잠깐 쉬어요',pause:2.5,face:'up'},
    {to:[320,256],label:'이제 집으로 돌아가요'},
    {to:[320,208],label:'문을 지나 집으로 들어가요',pause:.4,face:'up',next:'inside'},
  ],
  inside:[
    {to:[248,176],label:'책상 옆에서 책을 구경해요',pause:2,face:'left'},
    {to:[328,160],label:'포근한 둥지 옆에서 쉬어요',pause:3,face:'up'},
    {to:[144,176],label:'집 안을 천천히 둘러봐요',pause:1,face:'up'},
    {to:[224,304],label:'다시 마당으로 나가요',pause:.5,face:'down',next:'yard'},
  ],
};
export function walkable(scene,x,y){
  const bounds=scene==='yard'?[32,96,608,456]:[40,88,408,312];
  if(x<bounds[0]||y<bounds[1]||x>bounds[2]||y>bounds[3])return false;
  return OBJECTS[scene].every(({block:b})=>!b||x+5<=b[0]||x-5>=b[0]+b[2]||y+3<=b[1]||y-3>=b[1]+b[3]);
}
export function route(scene,from,to){
  const key=p=>p.join(','),start=from.map(v=>Math.round(v/8)*8),target=key(to);
  const queue=[start],previous=new Map([[key(start),null]]);let found=null;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(key(p)===target){found=p;break;}
    for(const q of [[p[0]+8,p[1]],[p[0]-8,p[1]],[p[0],p[1]+8],[p[0],p[1]-8]]){
      if(!previous.has(key(q))&&walkable(scene,...q)){previous.set(key(q),p);queue.push(q);}
    }
  }
  if(!found)throw Error(`Unreachable visual-study destination: ${scene} ${target}`);
  const path=[];for(let p=found;p;p=previous.get(key(p)))path.push(p);
  return path.reverse().slice(1);
}
export function createMovement(){
  const s={scene:'yard',x:320,y:256,direction:'down',frame:1,walking:false,paused:false,stage:0,path:[],hold:0,distance:0,speed:0,fade:0,transition:null,clock:0,visits:0,label:''};
  function begin(){const step=TOURS[s.scene][s.stage];s.path=route(s.scene,[s.x,s.y],step.to);s.label=step.label;s.hold=0;}
  function jump(scene){
    Object.assign(s,{scene,x:scene==='yard'?320:224,y:scene==='yard'?256:304,direction:scene==='yard'?'down':'up',frame:1,walking:false,stage:0,hold:0,distance:0,speed:0,transition:null,fade:0});begin();
  }
  function advance(dt){
    if(s.paused)return;s.clock+=dt;
    if(s.transition){
      s.fade+=dt*2.5;
      if(s.fade>=1){const next=s.transition;jump(next);s.fade=-1;s.visits++;}
      return;
    }
    if(s.fade<0){s.fade=Math.min(0,s.fade+dt*2.5);return;}
    const step=TOURS[s.scene][s.stage];
    if(s.path.length){
      const [tx,ty]=s.path[0],dx=tx-s.x,dy=ty-s.y,d=Math.hypot(dx,dy);
      s.direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      const remaining=d+(s.path.length-1)*8;
      s.speed=Math.min(42,s.speed+dt*140,Math.max(12,remaining*5));
      const move=Math.min(d,s.speed*dt);s.x+=dx/d*move;s.y+=dy/d*move;s.distance+=move;
      s.walking=true;s.frame=[0,1,2,1][Math.floor(s.distance/6)%4];
      if(move>=d){s.x=tx;s.y=ty;s.path.shift();}
    }else{
      s.walking=false;s.speed=0;s.direction=step.face??s.direction;s.frame=s.clock%5>4.8?3:1;s.hold+=dt;
      if(s.hold>=(step.pause??.1)){
        if(step.next)s.transition=step.next;
        else{s.stage=(s.stage+1)%TOURS[s.scene].length;begin();}
      }
    }
  }
  begin();return {state:s,advance,jump};
}
