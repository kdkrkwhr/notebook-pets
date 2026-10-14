// Animate the companion's actual pixel portrait; species alone cannot describe its appearance.
export function facing(dx,dy){return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';}
export function drawAvatar(c,x,y,{portrait,direction='down',frame=0,scale=2,hit=false,fallen=false}={}){
 if(!portrait)return;
 const step=frame===1?1:frame===3?-1:0;
 c.save();c.translate(Math.round(x),Math.round(y-Math.abs(step)*scale));
 c.scale(direction==='left'?-scale:scale,scale);c.imageSmoothingEnabled=false;
 if(fallen){c.globalAlpha=.45;c.rotate(-.7);}
 else c.rotate(step*.035);
 // A single portrait has no invented rear anatomy. Mirror for horizontal travel,
 // retain its face and silhouette, and use a small step/bob for automatic movement.
 if(direction==='left'||direction==='right')c.scale(.94,1);
 if(hit)c.filter='brightness(1.6)';
 c.drawImage(portrait,-22,-44,44,44);c.restore();
}
