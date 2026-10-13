// A small four-direction pixel rig. Species controls anatomy; the portrait supplies colors.
const DEFAULT=['#9d83bf','#e9d9c0','#4b355b'];
export function portraitPalette(img){
 try{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,32,32);
  const p=c.getImageData(0,0,32,32).data,bins=new Map();
  for(let i=0;i<p.length;i+=4){if(p[i+3]<128||Math.min(p[i],p[i+1],p[i+2])>230)continue;const rgb=[p[i],p[i+1],p[i+2]].map(v=>Math.round(v/32)*32);const k=rgb.join(',');bins.set(k,(bins.get(k)||0)+1);}
  const colors=[...bins].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k.split(',').map(Number));
  const base=colors.find(c=>Math.max(...c)-Math.min(...c)>25)||colors[0];if(!base)return DEFAULT;
  const hex=rgb=>'#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  return [hex(base),hex(base.map(v=>v*.45+140)),hex(base.map(v=>v*.4))];
 }catch{return DEFAULT;}
}
export function facing(dx,dy){return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';}
export function drawAvatar(c,x,y,{species='monster',palette=DEFAULT,direction='down',frame=0,scale=2,hit=false,fallen=false}={}){
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);c.imageSmoothingEnabled=false;if(fallen){c.globalAlpha=.45;c.rotate(-.7);}
 const [base,light,dark]=palette,side=direction==='left'||direction==='right',back=direction==='up',step=frame===1?1:frame===3?-1:0;
 if(direction==='left')c.scale(-1,1);
 const rect=(x,y,w,h,color)=>{c.fillStyle=hit?'#fff2d0':color;c.fillRect(x,y,w,h);};
 // Distinct rear silhouette and appendages; the back view never repeats the face.
 if(['dragon','bird','fairy'].includes(species)){
  rect(-15,-20-step,8,3,dark);rect(-14,-19-step,7,7,base);rect(7,-20+step,8,3,dark);rect(7,-19+step,7,7,base);
  rect(-13,-18-step,4,4,light);rect(9,-18+step,4,4,light);
 }
 if(['reptile','dragon','mammal','monster'].includes(species)){rect(side?-13:-3,-7,side?9:6,5,dark);rect(side?-16:-2,-10,4,5,base);}
 if(species==='ghost'){rect(-7,-7,14,4,dark);rect(-7,-8,4,6+step,base);rect(-1,-8,4,5-step,base);rect(5,-8,3,4,base);}
 else {rect(-7,-5+step,5,5,dark);rect(3,-5-step,5,5,dark);rect(-6,-3+step,4,2,light);rect(4,-3-step,4,2,light);}
 rect(-7,-20,14,16,dark);rect(-10,-17,20,11,dark);rect(-8,-17,16,10,base);rect(-6,-19,12,14,base);rect(-5,-14,10,7,back?base:light);
 rect(-12,-17-step,4,8,dark);rect(-11,-17-step,3,6,base);rect(9,-17+step,4,8,dark);rect(9,-17+step,3,6,base);
 rect(side?-4:-7,-33,side?11:14,19,dark);rect(side?-7:-11,-29,side?17:22,12,dark);
 rect(side?-3:-6,-32,side?9:12,17,base);rect(side?-6:-10,-28,side?15:20,10,base);rect(-6,-30,9,3,light);
 if(species==='fairy'){rect(-17,-23-step,5,8,light);rect(-15,-26-step,6,8,base);rect(12,-23+step,5,8,light);rect(9,-26+step,6,8,base);rect(-2,-37,3,4,light);}
 if(species==='ghost'){rect(-8,-32,5,5,base);rect(4,-34,4,6,light);}
 if(['mammal','monster','dragon'].includes(species)){rect(-10,-36,5,9,dark);rect(-9,-35,3,6,light);if(!side){rect(5,-36,5,9,dark);rect(6,-35,3,6,light);}}
 if(species==='plant'){rect(-2,-37,3,9,dark);rect(-8,-37,7,4,base);rect(1,-39,7,5,light);}
 if(species==='machine'){rect(-2,-36,3,6,dark);rect(-3,-38,5,3,light);rect(-12,-27,3,9,dark);rect(10,-27,3,9,dark);}
 if(species==='reptile'||species==='dragon'){rect(back?-2:-8,-33,4,5,light);rect(back?-2:-6,-18,3,9,dark);}
 if(species==='bird'){rect(side?8:-2,-23,side?5:5,3,'#e9b755');}
 if(!back){
  if(side){rect(4,-26,4,5,'#fff4dc');rect(6,-25,2,3,'#20202b');rect(8,-20,3,2,dark);}
  else {rect(-6,-26,4,5,'#fff4dc');rect(3,-26,4,5,'#fff4dc');rect(-4,-25,2,3,'#20202b');rect(3,-25,2,3,'#20202b');rect(-1,-19,3,1,dark);}
 }else{rect(-4,-25,8,2,light);rect(-2,-21,4,3,base);}
 c.restore();
}
