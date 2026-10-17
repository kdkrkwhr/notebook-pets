// Local pixel objects: individual scenery, never a generated room/background.
export function gardenSprite(art,doc=document){
 const canvas=doc.createElement('canvas');canvas.width=64;canvas.height=80;
 const c=canvas.getContext('2d'),color=art.color,v=art.variant||0;
 const r=(x,y,w,h,col=color)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
 const stone='#8c9487',light='#d5d4bd',wood='#9d754b',dark='#5b5d43',leaf='#628755';
 const tint=(col,amount)=>/^#[0-9a-f]{6}$/i.test(col)?'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(col.slice(i,i+2),16)+amount)).toString(16).padStart(2,'0')).join(''):col;
 const oval=(x,y,w,h,col)=>{for(let row=0;row<h;row++){const n=Math.abs((row+.5)/h*2-1),inset=Math.round(w/2*(1-Math.sqrt(1-n*n))),width=w-inset*2,left=x+inset;
  r(left,y+row,width,1,tint(col,-30));if(width>3&&row>0&&row<h-1){r(left+1,y+row,width-2,1,tint(col,row<h*.35?10:row>h*.7?-16:0));
   if(h>10)for(let px=left+3;px<left+width-2;px+=4)if((px*17+row*29)%11<3)r(px,y+row,2,1,tint(col,row<h*.55?22:-24));}}
 };
 const pot=(x,y,w=16)=>{r(x-1,y-1,w+2,4,dark);r(x,y,w,4,'#bb8557');r(x+2,y+4,w-4,10,'#996d4b');r(x+3,y+4,2,8,'#d1a16d');};
 const flower=(x,y,n=0)=>{r(x,y,2,13,leaf);r(x-4,y+6,4,2,'#81a562');r(x+2,y+4,4,2,leaf);r(x-3,y-3,8,5,color);r(x-1,y-5,4,9,color);r(x,y-1,2,2,n?'#a77e42':'#f7d67e');};
 oval(9,71,47,7,'#3d593630');
 switch(art.kind){
 case 'flower':
  r(7,67,50,5,'#99774d');r(9,63,46,4,'#b29860');
  for(let i=0;i<5;i++)flower(13+i*9,48+(i%2?5:0)-v%3*2,v===1);
  if(v===4)for(let i=0;i<3;i++)oval(8+i*17,43+i%2*5,16,13,color);
  break;
 case 'tree':
  r(29,37,7,36,dark);r(30,38,4,34,wood);r(23,68,19,5,wood);r(25,47,9,4,wood);r(35,42,9,4,wood);
  if(v===2){for(let i=0;i<3;i++){const w=22+i*11;for(let y=0;y<16;y++)r(32-Math.round(y*w/32),8+i*13+y,Math.max(2,Math.round(y*w/16)),2,color);}}
  else{oval(8,18,48,32,dark);oval(9,15,44,32,color);oval(17,9,32,23,color);oval(13,18,18,12,v===0?'#f3c8cf':'#9ab979');oval(35,26,17,15,tint(color,-10));}
  if(v===3)for(const [x,y] of [[17,27],[39,19],[38,37]])r(x,y,5,6,'#ead16c');
  if(v===4)for(let x=12;x<54;x+=7)r(x,35,3,18+(x%3)*3,color);
  if(v===5){pot(23,58,19);r(30,47,4,13,wood);}
  break;
 case 'bench':
  r(9,36,46,22,dark);r(11,38,42,7);r(11,48,42,7);r(6,59,52,7,dark);r(7,58,50,5);r(11,65,5,9,wood);r(48,65,5,9,wood);r(8,52,3,10,light);r(53,52,3,10,light);break;
 case 'picnic':
  r(7,48,50,24,light);r(9,50,46,20);
  for(let y=50;y<70;y+=6)for(let x=9;x<55;x+=8)if((x+y)%3)r(x,y,5,4,'#f2d4b2');
  pot(22,44,14);r(41,52,6,5,'#eee2b4');break;
 case 'table':
  r(18,53,4,20,wood);r(43,53,4,20,wood);oval(7,43,50,15,dark);oval(8,40,48,15);r(24,39,7,5,light);r(38,41,6,4,light);r(32,34,6,8,'#bc9471');break;
 case 'parasol':
  r(30,22,3,50,wood);oval(3,17,58,21,dark);oval(4,14,56,21,color);r(26,12,10,24,'#f0ddac');r(30,11,3,4,wood);r(12,63,40,7,wood);r(17,69,3,6,wood);r(45,69,3,6,wood);break;
 case 'hammock':
  r(7,34,4,40,wood);r(53,34,4,40,wood);r(11,44,42,3,light);oval(12,42,40,18,dark);oval(13,42,38,14,color);r(15,45,10,6,'#ded8a7');break;
 case 'pond':
  oval(3,47,58,27,stone);oval(7,49,50,20,'#487f84');oval(9,50,46,16,color);r(14,54,12,2,'#b5ddd0');r(34,60,14,2,'#bbd7c4');
  if(v){oval(37,51,12,5,leaf);r(42,47,4,5,'#e9b4c1');oval(14,61,10,4,leaf);}break;
 case 'fountain':
  oval(8,59,48,15,stone);oval(11,60,42,9,'#72afb5');r(28,35,9,29,stone);oval(18,32,29,9,light);r(30,24,5,9,color);r(30,20,5,5,'#b7dbd2');r(24,34,2,24,'#add6d0');r(40,35,2,25,'#add6d0');break;
 case 'birdbath':
  oval(18,68,28,6,stone);r(29,46,7,25,color);oval(13,40,39,12,dark);oval(14,39,37,9,color);oval(20,41,25,4,'#92c7c4');
  if(!v){r(39,32,7,7,'#b8a17c');r(45,35,4,2,'#d7bd7d');r(40,31,2,2,dark);}break;
 case 'well':
  r(14,42,36,28,stone);r(16,43,32,24,light);r(19,39,26,5,dark);r(12,24,4,40,wood);r(48,24,4,40,wood);r(10,20,44,7,wood);r(15,15,34,7,color);r(31,27,2,21,wood);pot(28,47,10);break;
 case 'lantern':
  r(29,25,5,46,dark);r(23,70,17,4,stone);r(23,29,18,3,dark);r(25,32,14,16,color);r(28,34,8,12,'#f4e2a3');r(23,48,18,3,dark);r(26,25,12,4,dark);break;
 case 'mushroom':
  for(const [x,y,w] of [[12,57,21],[34,64,19],[29,45,17]]){r(x+w/2-2,y,5,14,'#e6d5af');oval(x,y-8,w,13,dark);oval(x+1,y-8,w-2,10,color);r(x+5,y-6,3,3,light);r(x+w-7,y-3,3,2,light);}break;
 case 'statue':
  r(17,69,31,5,stone);oval(22,44,22,27,color);oval(22,28,23,20,color);r(23,23,6,12,color);r(38,23,6,12,color);r(27,37,2,2,dark);r(38,37,2,2,dark);r(32,42,3,2,light);r(40,60,10,5,color);break;
 case 'windmill':
  r(23,37,20,35,color);r(20,68,26,6,stone);r(29,60,8,12,wood);r(19,31,29,7,wood);r(25,24,17,9,wood);r(31,17,4,40,light);r(13,36,41,4,light);r(28,32,11,11,wood);break;
 case 'chime':
  r(11,29,4,44,wood);r(11,27,39,4,wood);r(37,30,1,8,dark);r(24,39,27,4,wood);for(let i=0;i<4;i++){r(27+i*6,43,1,8,wood);r(26+i*6,49,3,12+i%2*5,color);}break;
 case 'mailbox':
  r(29,44,6,29,wood);r(17,30,32,18,dark);r(18,28,30,17,color);r(17,42,31,3,wood);r(24,35,17,2,light);r(43,23,2,13,wood);r(45,23,8,6,'#d9a26c');break;
 case 'planter':
  pot(10,57,44);for(let i=0;i<5;i++){r(16+i*8,40,2,18,leaf);oval(10+i*8,40-i%2*7,14,8,color);if(v===1)oval(13+i*8,47,11,7,'#b5cab0');if(v===2)r(10+i*8,36,13,2,color);}break;
 case 'rocks':
  oval(5,54,54,20,'#c7b896');for(const [x,y,w] of [[10,50,20],[30,44,23],[31,62,18]]){oval(x,y,w,12,stone);r(x+5,y+2,w-10,2,color);}break;
 case 'log':
  r(15,46,36,24,wood);oval(12,39,40,15,dark);oval(14,40,36,12,'#c7a16d');oval(22,43,20,6,'#a88154');r(24,45,13,1,light);for(let i=0;i<4;i++)r(19+i*8,54,2,14,'#745b3f');break;
 case 'shelter':
  r(29,43,5,29,wood);r(18,29,30,23,color);r(15,25,36,6,wood);r(21,21,24,5,wood);r(24,34,4,12,dark);r(35,34,4,12,dark);r(10,51,7,5,'#dbaf76');r(16,48,5,10,'#b48bad');break;
 }
 return canvas;
}
