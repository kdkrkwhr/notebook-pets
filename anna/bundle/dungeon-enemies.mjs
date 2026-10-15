// Enemy-specific pixel silhouettes. These deliberately do not reuse the pet avatar rig.
export const ENEMY_KINDS=['slime','bat','beetle','sentinel'];
const ACCENTS={hellgate:'#ffb36b',icekingdom:'#b6edff',dreamforest:'#d9b8ff',sunkenpalace:'#8ff1dc',clockworkcity:'#ffd77a'};
// Original bosses use pose rows; expansion bosses use pose columns in square cells.
export const BOSS_ART={
 hellgate:{file:'guardians',column:0,columns:3,cellHeight:56},
 icekingdom:{file:'guardians',column:1,columns:3,cellHeight:56},
 dreamforest:{file:'guardians',column:2,columns:3,cellHeight:56},
 sunkenpalace:{file:'guardians-expansion-v1',row:0,rows:2,columns:3,cellHeight:84},
 clockworkcity:{file:'guardians-expansion-v1',row:1,rows:2,columns:3,cellHeight:84},
};
export function drawEnemy(c,x,y,{kind,region='hellgate',elapsed=0,beat=0,active=false,dead=false,reduced=false,direction='left',scale=2}={}){
 if(!ENEMY_KINDS.includes(kind))return;
 const frame=reduced||dead?0:Math.floor(elapsed/150)%4,step=[0,1,0,-1][frame];
 const windup=active&&beat<.45,attack=active&&beat>=.45&&beat<.7,hit=active&&beat>.75&&beat<.9;
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(direction==='left'?-scale:scale,scale);c.imageSmoothingEnabled=false;if(dead)c.globalAlpha*=.25;
 const rect=(x,y,w,h,color)=>{c.fillStyle=hit?'#fff4d8':color;c.fillRect(x,y,w,h);};
 const poly=(points,color)=>{c.fillStyle=hit?'#fff4d8':color;c.beginPath();points.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.closePath();c.fill();};
 const ink='#20212e',accent=ACCENTS[region]||ACCENTS.hellgate;
 if(kind==='slime'){
  // A low gelatinous dome: no head, arms or legs. Squash before the short body lunge.
  if(!reduced){c.translate(attack?9:0,attack?-5:0);c.scale(windup?1.16:1,windup?.8:1+step*.035);}
  poly([[-19,-1],[-21,-5],[-18,-12],[-14,-12],[-14,-19],[-9,-19],[-9,-24],[4,-24],[4,-21],[11,-21],[11,-17],[16,-17],[16,-11],[20,-11],[22,-4],[18,0]],ink);
  poly([[-17,-3],[-18,-7],[-15,-11],[-12,-11],[-12,-17],[-7,-17],[-7,-22],[2,-22],[2,-19],[9,-19],[9,-15],[14,-15],[14,-9],[18,-9],[19,-4],[15,-2]],'#68bd82');
  rect(-12,-10,26,6,'#49966d');rect(-6,-20,7,3,'#c4f3bc');rect(-10,-17,4,3,'#a3e5a1');rect(8,-12,3,5,ink);rect(-1,-13,3,5,ink);rect(3,-6,4,2,'#285b50');rect(-14,-4,6,2,accent);
 }else if(kind==='bat'){
  // Wide scalloped wings, a tiny hanging body, pointed ears and white fangs.
  if(!reduced)c.translate(attack?12:0,-7+step*2);
  const lift=reduced?0:frame===1?-8:frame===3?7:0;
  for(const side of [-1,1]){c.save();c.scale(side,1);
   poly([[3,-23],[11,-30+lift],[28,-37+lift],[24,-23+lift],[29,-13+lift],[18,-17],[14,-9],[9,-16],[4,-13]],ink);
   poly([[6,-22],[12,-27+lift],[24,-32+lift],[20,-23+lift],[24,-17+lift],[17,-20],[13,-14],[9,-19]],'#9366bd');
   poly([[7,-22],[19,-26+lift],[13,-19]],'#bf92d4');c.restore();
  }
  poly([[-7,-27],[-9,-40],[-3,-35],[0,-30],[4,-36],[9,-39],[7,-24],[9,-20],[7,-10],[3,-6],[-4,-6],[-8,-12],[-9,-21]],ink);
  rect(-6,-29,12,17,'#604b84');rect(-4,-26,10,11,'#8e6aad');rect(-6,-35,2,5,'#d695be');rect(5,-35,2,5,'#d695be');rect(-4,-23,3,3,'#ffce7e');rect(3,-23,3,3,'#ffce7e');rect(-3,-17,2,4,'#fff7df');rect(3,-17,2,4,'#fff7df');rect(-4,-8,2,3,accent);rect(3,-8,2,3,accent);
 }else if(kind==='beetle'){
  // Six jointed legs around a wide split carapace, antennae and forward mandibles.
  if(!reduced)c.translate(attack?10:0,step);
  for(const side of [-1,1]){c.save();c.scale(side,1);for(let i=0;i<3;i++){
   const offset=reduced?0:step*(i%2?2:-2);poly([[10,-23+i*8],[19,-27+i*8+offset],[24,-21+i*8+offset],[22,-18+i*8+offset],[17,-22+i*8+offset],[11,-18+i*8]],ink);rect(17,-23+i*8+offset,4,3,'#8ba4a8');
  }c.restore();}
  poly([[-11,-29],[-16,-23],[-16,-10],[-11,-3],[9,-3],[15,-10],[15,-22],[9,-29]],ink);
  poly([[-10,-26],[-13,-21],[-13,-11],[-8,-6],[-1,-6],[-1,-27]],'#49898c');poly([[1,-27],[8,-26],[12,-21],[12,-11],[8,-6],[1,-6]],'#77b9ad');
  rect(-9,-22,5,7,'#98d6c7');rect(4,-23,4,5,'#c4e8d1');rect(-1,-27,2,23,ink);rect(-5,-34,11,8,ink);rect(-3,-33,7,6,'#4a6672');rect(-5,-38,2,6,ink);rect(5,-39,2,7,ink);rect(-6,-40,3,3,accent);rect(5,-41,3,3,accent);rect(-3,-32,2,2,'#ffdf9a');rect(2,-32,2,2,'#ffdf9a');
 }else{
  // A massive stone construct: separate blocks, oversized fists and a glowing core.
  const arm=windup&&!reduced?-9:attack&&!reduced?5:0;
  rect(-13,-9+step,10,9,ink);rect(4,-9-step,10,9,ink);rect(-11,-7+step,7,5,'#8c929b');rect(6,-7-step,7,5,'#8c929b');
  rect(-16,-33,32,27,ink);rect(-13,-31,26,22,'#737f92');rect(-11,-30,10,5,'#aab5bc');rect(8,-26,5,15,'#536274');
  for(const side of [-1,1]){c.save();c.scale(side,1);rect(15,-31+arm,11,13,ink);rect(18,-19+arm,12,15,ink);rect(17,-29+arm,7,9,'#a3adb1');rect(20,-17+arm,8,10,'#7f8b99');rect(20,-17+arm,8,3,'#b8c0c2');c.restore();}
  rect(-10,-45,21,16,ink);rect(-8,-43,17,12,'#939da6');rect(-9,-36,20,5,ink);rect(-6,-35,5,2,accent);rect(3,-35,5,2,accent);rect(-4,-25,9,11,ink);rect(-2,-23,5,7,accent);rect(-1,-22,3,3,'#fff7d8');rect(-10,-19,5,2,'#485566');rect(5,-13,6,2,'#485566');
 }
 c.restore();
}
