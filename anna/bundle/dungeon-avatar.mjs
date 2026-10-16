import {drawHomeSprite} from './home-sprite.mjs';
// Prefer the same directional poses used at home. The portrait is a legacy fallback.
export const TURN_MS=180;
export function facing(dx,dy){return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';}
// -1 faces left, 1 faces right; values in between are the card mid-turn. Vertical travel keeps the last side.
export function turnToward(current,direction,dt){
 const target=direction==='left'?-1:direction==='right'?1:Math.sign(current)||1;
 if(!(dt>=0)||dt>=TURN_MS)return target;
 const next=current+Math.sign(target-current)*2*dt/TURN_MS;
 return target>current?Math.min(target,next):Math.max(target,next);
}
let buffer=null;
// Stepped bands keep the pixel look. Light comes from the world's left, so it stays put when the sprite mirrors.
function lit(portrait,side,edge,back){
 buffer??=document.createElement('canvas');buffer.width=portrait.width;buffer.height=portrait.height;
 const b=buffer.getContext('2d');b.imageSmoothingEnabled=false;b.drawImage(portrait,0,0);b.globalCompositeOperation='source-atop';
 const bands=4,w=buffer.width/bands;
 for(let i=0;i<bands;i++){
  const light=side>0?i:bands-1-i,a=.14-light*.1-edge*.3-(back?.1:0);
  b.fillStyle=a>0?`rgba(255,244,214,${a})`:`rgba(20,14,30,${-a})`;b.fillRect(Math.floor(i*w),0,Math.ceil(w),buffer.height);
 }
 b.globalCompositeOperation='source-over';return buffer;
}
export function drawAvatar(c,x,y,{sprite,portrait,direction='down',frame=0,scale=2,hit=false,fallen=false,turn=direction==='left'?-1:1,walking=frame>0}={}){
 if(sprite){drawHomeSprite(c,sprite,x,y,{direction,frame:walking?[0,1,2,1][frame%4]:1,height:32*scale,hit,fallen});return;}
 if(!portrait)return;
 // A single portrait has no invented rear anatomy. Depth comes from turning, squash, lean, size and light only.
 const side=turn<0?-1:1,width=Math.max(.12,Math.abs(turn)),depth=direction==='up'?.92:direction==='down'?1.04:1;
 const lift=walking&&frame%2?scale*1.5:0,squash=walking&&frame%2===0?.06:0,shadow=depth*(1-lift/24);
 c.save();c.fillStyle='#0008';c.beginPath();c.ellipse(Math.round(x),Math.round(y+2),20*shadow,8*shadow,0,0,Math.PI*2);c.fill();c.restore();
 c.save();c.translate(Math.round(x),Math.round(y-lift));
 c.scale(side*scale*depth*width*(1+squash),scale*depth*(1-squash));c.imageSmoothingEnabled=false;
 if(fallen){c.globalAlpha=.45;c.rotate(-.7);}
 else if(walking)c.rotate(frame%2?.06:.03);
 if(hit)c.filter='brightness(1.6)';
 c.drawImage(lit(portrait,side,1-width,direction==='up'),-22,-44,44,44);c.restore();
}
