// Presentation only: routes, camera and effects replay the already committed result.
export const WORLD={width:1536,height:1024};
export const WALK_MS=18000,ROUND_MS=1700;
const ROUTE=[[270,866],[350,815],[432,756],[461,699],[507,635],[601,574],[548,555],[458,521],[418,489],[494,518],[605,562],[738,501],[874,432],[1022,360],[1128,309],[1190,307]];
const COLORS={hellgate:'#ff9a55',icekingdom:'#8cdbff',dreamforest:'#c4acff'};
const assets=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function routePosition(progress){
 let distance=clamp(progress,0,1)*ROUTE.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-ROUTE[i][0],p[1]-ROUTE[i][1]),0);
 for(let i=1;i<ROUTE.length;i++){const a=ROUTE[i-1],b=ROUTE[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=length)return [a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length];distance-=length;}
 return [...ROUTE.at(-1)];
}
export function cameraAt(point,width,height){
 const zoom=clamp(width/900,.72,1.1),vw=width/zoom,vh=height/zoom;
 return {zoom,x:clamp(point[0]+60,vw/2,WORLD.width-vw/2),y:clamp(point[1]-50,vh/2,WORLD.height-vh/2)};
}
function asset(key){
 if(!assets.has(key))assets.set(key,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{assets.delete(key);reject(Error('Dungeon art unavailable'));};img.src=new URL(`./assets/dungeons-v2/${key}.png`,import.meta.url).href;}));
 return assets.get(key);
}
export function paintDungeon(canvas,key){
 const c=canvas.getContext('2d');canvas.width=480;canvas.height=270;
 c.fillStyle='#10151b';c.fillRect(0,0,480,270);
 asset(key).then(img=>{if(canvas.isConnected){c.drawImage(img,110,230,1340,754,0,0,480,270);canvas.dataset.art='ready';}}).catch(()=>{canvas.dataset.art='failed';});
}
export function createDungeonScene(canvas,explorer){
 const c=canvas.getContext('2d');let backdrop=null,atlas=null,key='hellgate',generation=0,ready=false;
 function ellipse(x,y,rx,ry,color,fill=true){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c[fill?'fillStyle':'strokeStyle']=color;c[fill?'fill':'stroke']();}
 function guardian(row,x,y,alpha=1){
  const column=['hellgate','icekingdom','dreamforest'].indexOf(key),sw=atlas.width/3,sh=atlas.height/3;
  c.save();c.globalAlpha=alpha;ellipse(x,y,34,12,'#0009');
  c.drawImage(atlas,column*sw,row*sh,sw,sh,x-86,y-110,172,115);c.restore();
 }
 return {
  async load(region){const token=++generation;ready=false;key=region;explorer.hidden=true;c.clearRect(0,0,canvas.width,canvas.height);canvas.dataset.art='loading';try{const images=await Promise.all([asset(region),asset('guardians')]);if(token!==generation)return false;[backdrop,atlas]=images;ready=true;canvas.dataset.art='ready';return true;}catch{if(token===generation)canvas.dataset.art='failed';return false;}},
  draw({elapsed=0,run=null,finished=false,reduced=false}={}){
   if(!ready)return;
   explorer.hidden=false;
   const width=Math.max(1,Math.round(canvas.clientWidth)),height=Math.max(1,Math.round(canvas.clientHeight));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   const color=COLORS[key],travel=run?clamp(elapsed/WALK_MS,0,1):0;
   const hero=routePosition(finished?1:travel),ahead=routePosition(clamp(travel+.015,0,1));
   const battle=run&&elapsed>=WALK_MS,bt=Math.max(0,elapsed-WALK_MS),index=Math.min(run?.turns.length-1||0,Math.floor(bt/ROUND_MS)),phase=(bt%ROUND_MS)/ROUND_MS;
   const frame=run?.turns[index],previous=index?run?.turns[index-1]:{hp_me:run?.max_hp_me,hp_enemy:run?.max_hp_enemy};
   const dodge=battle&&!finished&&frame?.dodged_me&&phase>.25&&phase<.66?Math.sin((phase-.25)/.41*Math.PI)*46:0;
   hero[0]-=dodge*.45;hero[1]+=dodge*.8;
   const camera=cameraAt(hero,width,height),zoom=camera.zoom;
   const shake=battle&&!finished&&!reduced&&phase>.48&&phase<.56?Math.sin(phase*200)*2:0;
   c.setTransform(1,0,0,1,0,0);c.fillStyle='#080d13';c.fillRect(0,0,width,height);
   c.save();c.translate(width/2-camera.x*zoom+shake,height/2-camera.y*zoom);c.scale(zoom,zoom);c.imageSmoothingEnabled=false;c.drawImage(backdrop,0,0,WORLD.width,WORLD.height);
   const boss=[1261,270],windup=battle&&!finished&&phase<.46,impact=battle&&!finished&&phase>=.46&&phase<.7;
   // Telegraph is attached to the boss's attack, not to a random particle timer.
   if(windup){c.lineWidth=2;ellipse(hero[0],hero[1],57,23,`rgba(236,95,65,${.08+phase*.32})`);ellipse(hero[0],hero[1],57*(.45+phase),23*(.45+phase),'#ffb376',false);}
   const defeated=finished&&run?.hp_enemy<=0;
   guardian(impact?2:windup?1:0,boss[0]-(impact?14:0),boss[1]+(impact?8:0),defeated ? .22 : 1);
   if(battle&&!finished&&phase>.47&&phase<.77){
    c.save();c.translate(hero[0]+10,hero[1]-27);c.rotate(-.5);c.strokeStyle=color;c.lineWidth=impact?6:2;c.beginPath();c.ellipse(0,0,58,24,0,-2.5,.6);c.stroke();c.restore();
   }
   if(battle&&!finished&&phase>.72){
    const p=(phase-.72)/.28,x=hero[0]+(boss[0]-hero[0])*p,y=hero[1]-32+(boss[1]-hero[1]-10)*p;
    c.save();c.shadowColor=color;c.shadowBlur=16;ellipse(x,y,7,5,'#fff3ce');c.restore();
   }
   ellipse(hero[0],hero[1]+2,22,8,'#0009');ellipse(hero[0],hero[1]+2,24,9,color+'88',false);
   // Small footsteps and environmental motes sit in world space.
   if(run&&!finished&&travel<1&&!reduced){for(let i=0;i<3;i++){const age=((elapsed/180+i*.33)%1);ellipse(hero[0]-12-age*15,hero[1]+7+age*9,3-age*2,1.5,color+Math.round((1-age)*70).toString(16).padStart(2,'0'));}}
   for(let i=0;i<28;i++){const x=(i*137+31)%WORLD.width,y=(i*83+100-(reduced?0:elapsed/70)*(key==='icekingdom'?-1:1)+WORLD.height*100)%WORLD.height;c.globalAlpha=.22+(i%4)*.12;c.fillStyle=color;c.fillRect(x,y,i%3===0?3:2,2);}c.globalAlpha=1;
   if(battle&&!finished&&phase>.52){
    c.font='bold 18px system-ui';c.textAlign='center';c.shadowColor='#000';c.shadowBlur=5;
    const damage=Math.max(0,Math.round((previous?.hp_me??0)-(frame?.hp_me??0)));
    c.fillStyle=damage?'#ffab91':'#d3f4ff';c.fillText(damage?`−${damage}`:'↗',hero[0]-20,hero[1]-65-(phase-.52)*35);
    if(phase>.8){const dealt=Math.max(0,Math.round((previous?.hp_enemy??0)-(frame?.hp_enemy??0)));c.fillStyle='#ffe8b0';c.fillText(dealt?`−${dealt}`:'↗',boss[0],boss[1]-108-(phase-.8)*35);}c.shadowBlur=0;
   }
   c.restore();
   const vignette=c.createRadialGradient(width*.5,height*.5,height*.2,width*.5,height*.5,Math.max(width,height)*.72);vignette.addColorStop(0,'#03070b00');vignette.addColorStop(1,'#03070b99');c.fillStyle=vignette;c.fillRect(0,0,width,height);
   // A compact route map, rather than exposing the whole level as the playfield.
   const mw=108,mh=72,mx=width-mw-18,my=18;c.fillStyle='#090f19c9';c.fillRect(mx-5,my-5,mw+10,mh+10);c.strokeStyle='#d5be9360';c.strokeRect(mx-5,my-5,mw+10,mh+10);c.beginPath();ROUTE.forEach((p,i)=>c[i?'lineTo':'moveTo'](mx+p[0]/WORLD.width*mw,my+p[1]/WORLD.height*mh));c.strokeStyle='#bcaf91';c.lineWidth=1.5;c.stroke();ellipse(mx+hero[0]/WORLD.width*mw,my+hero[1]/WORLD.height*mh,3,3,'#fff0b0');
   const sx=width/2+(hero[0]-camera.x)*zoom,sy=height/2+(hero[1]-camera.y)*zoom;
   const walking=!!run&&!finished&&!battle,bob=reduced?0:walking?Math.abs(Math.sin(elapsed/95))*3:Math.sin(elapsed/420)*1;
   explorer.style.left=`${sx/width*100}%`;explorer.style.top=`${sy/height*100}%`;explorer.style.width=`${62*zoom}px`;
   explorer.style.transform=`translate(-50%,calc(-92% - ${bob}px)) scaleX(${ahead[0]>=hero[0]?1:-1}) rotate(${walking&&!reduced?Math.sin(elapsed/95)*3:0}deg)`;
   explorer.classList.toggle('dungeon-hit',!!(impact&&!frame?.dodged_me));explorer.classList.toggle('dungeon-fallen',!!(finished&&run?.hp_me<=0));
   canvas.dataset.camera=`${camera.x.toFixed(1)},${camera.y.toFixed(1)}`;canvas.dataset.phase=finished?'finished':battle?'battle':run?'travel':'preview';
  },
 };
}
