// Enemy-specific pixel silhouettes. These deliberately do not reuse the pet avatar rig.
export const ENEMY_KINDS=['slime','bat','beetle','sentinel','crownkeeper','clockgolem'];
const ACCENTS={hellgate:'#ffb36b',icekingdom:'#b6edff',dreamforest:'#d9b8ff',sunkenpalace:'#8ff1dc',clockworkcity:'#ffd77a'};
// Regions without a column in the painted guardian atlas draw their boss procedurally.
export const BOSS_KINDS={sunkenpalace:'crownkeeper',clockworkcity:'clockgolem'};
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
 }else if(kind==='crownkeeper'){
  // Deep-sea crown keeper: a serpent rising from its coils, side fins, a coral crown and a lantern held in one claw.
  c.scale(1.2,1.2);const sway=reduced?0:step*2,lunge=attack?10:windup?-6:0;
  poly([[-34,0],[-38,-8],[-30,-16],[-10,-18],[14,-16],[30,-9],[34,0]],ink);poly([[-31,-2],[-34,-8],[-28,-13],[-10,-15],[13,-13],[27,-8],[30,-2]],'#2f7f8f');
  poly([[-22,-16],[-26,-26],[-14,-34],[8,-34],[22,-26],[20,-16]],ink);poly([[-19,-17],[-22,-25],[-13,-31],[7,-31],[18,-25],[17,-17]],'#3a93a0');
  for(let i=-26;i<26;i+=8)rect(i,-6,4,3,'#5fc3c9');for(let i=-14;i<12;i+=8)rect(i,-24,4,3,'#5fc3c9');
  poly([[-10+lunge,-32],[-14+lunge,-48+sway],[-8+lunge,-62+sway],[6+lunge,-66+sway],[18+lunge,-60+sway],[20+lunge,-44+sway],[12+lunge,-32]],ink);
  poly([[-7+lunge,-33],[-11+lunge,-47+sway],[-5+lunge,-59+sway],[6+lunge,-63+sway],[15+lunge,-58+sway],[17+lunge,-44+sway],[10+lunge,-33]],'#48a7b3');
  rect(-6+lunge,-52+sway,16,7,'#8ff1dc');rect(-3+lunge,-50+sway,3,3,ink);rect(5+lunge,-50+sway,3,3,ink);rect(-4+lunge,-40+sway,12,2,'#1f4f5a');
  for(const [dx,h] of [[-8,8],[-2,13],[4,9],[10,12]])rect(dx+lunge,-66-h+sway,4,h,'#f29b8f');rect(-10+lunge,-67+sway,24,4,'#ffd27a');
  for(const side of [-1,1]){c.save();c.scale(side,1);poly([[16,-40+sway],[34,-52+sway],[30,-34+sway],[20,-30+sway]],ink);poly([[18,-40+sway],[30,-48+sway],[27,-36+sway]],'#6fd3cc');c.restore();}
  rect(24+lunge,-30-sway,4,10,ink);rect(22+lunge,-38-sway,8,8,'#2a3a48');rect(24+lunge,-36-sway,4,4,accent);rect(23+lunge,-46-sway,6,8,'#ffd27a88');
  poly([[30,-9],[40,-20],[42,-6]],ink);poly([[31,-9],[38,-17],[39,-8]],'#6fd3cc');
 }else if(kind==='clockgolem'){
  // Clockwork golem: riveted brass chassis, a turning gear chest, a wind-up key and piston arms.
  c.scale(1.2,1.2);const arm=windup?-9:attack?6:0,spin=reduced?0:Math.floor(elapsed/120)%4;
  rect(-14,-8+step,11,8,ink);rect(3,-8-step,11,8,ink);rect(-12,-6+step,7,4,'#8a6a3a');rect(5,-6-step,7,4,'#8a6a3a');
  rect(-19,-36,38,29,ink);rect(-16,-34,32,24,'#b08a4a');rect(-14,-32,12,4,'#d9b56a');rect(10,-28,4,16,'#6e5430');
  for(const [dx,dy] of [[-14,-14],[12,-14],[-14,-30],[12,-30]])rect(dx,dy,2,2,'#f2dca0');
  c.save();c.translate(0,-22);c.rotate(spin*Math.PI/8);for(let i=0;i<8;i++){c.rotate(Math.PI/4);rect(-2,-10,4,4,'#e6c56b');}c.restore();
  rect(-6,-28,12,12,'#5c4420');rect(-4,-26,8,8,accent);rect(-2,-24,4,4,'#fff7d8');
  for(const side of [-1,1]){c.save();c.scale(side,1);rect(18,-34+arm,10,14,ink);rect(20,-20+arm,12,16,ink);rect(20,-32+arm,6,10,'#c99a4a');rect(22,-18+arm,8,11,'#8a6a3a');rect(23,-16+arm,2,7,'#e6c56b');rect(22,-18+arm,8,3,'#f2dca0');c.restore();}
  rect(-9,-50,19,15,ink);rect(-7,-48,15,11,'#b08a4a');rect(-5,-44,4,3,accent);rect(3,-44,4,3,accent);rect(-6,-39,13,2,'#6e5430');
  rect(-2,-62+(reduced?0:spin),4,12,ink);rect(-8,-66+(reduced?0:spin),16,5,'#d9b56a');rect(-6,-65+(reduced?0:spin),4,3,'#f2dca0');rect(3,-65+(reduced?0:spin),4,3,'#f2dca0');
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
