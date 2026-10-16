import {ART,ErasedError,erased,mergeSaved} from './data.mjs';
import {pixelSource,clearWhiteBorder} from './pixel-pet.mjs';
export const homeSpriteKey=v=>`${v.pet_id}/home-sprite-stage-${v.stage}`;
const requestKey=v=>`${v.pet_id}/home-sprite-request-stage-${v.stage}`;
const failureKeys={reference:'homeMovementReferenceFailed',generate:'homeMovementServiceFailed',response:'homeMovementResponseFailed',download:'homeMovementDownloadFailed',validate:'homeMovementInvalid',save:'homeMovementSaveFailed'};
export function movementFailureKey(error,pending=false){
 return pending?'homeMovementPending':failureKeys[error?.movementPhase]||'homeMovementFailed';
}
export function homeMovementStatus(v,art){
 if(currentHomeSprite(v,art))return 'homeMovementReady';
 const request=art?.[requestKey(v)];
 if(request?.source_path!==pixelSource(v,art||{}))return '';
 // A result kept only in the previous tab cannot be offered for save-only retry.
 return request.failure==='save'||request.failure==='download'?'homeMovementInterrupted':failureKeys[request.failure]||'homeMovementInterrupted';
}
export function currentHomeSprite(v,art){
 const e=art?.[homeSpriteKey(v)];
 return e?.format==='home-sprite-v1'&&e.pet_id===v.pet_id&&e.stage===v.stage&&e.source_path===pixelSource(v,art)&&e.path?.startsWith(`portraits/${v.pet_id}/`)?e:null;
}
export function drawHomeSprite(c,sheet,x,y,{direction='down',frame=1,height=32,hit=false,fallen=false}={}){
 const row={down:0,left:1,right:2,up:3}[direction]??0,box=sheet.frames[row*4+frame];
 const scale=height/sheet.maxHeight,w=Math.max(1,Math.round(box[2]*scale)),h=Math.max(1,Math.round(box[3]*scale));
 c.save();c.imageSmoothingEnabled=false;
 c.fillStyle='#26392c55';c.beginPath();c.ellipse(Math.round(x),Math.round(y),height*.28,height/16,0,0,Math.PI*2);c.fill();
 if(hit)c.filter='brightness(1.6)';if(fallen)c.globalAlpha=.45;
 c.drawImage(sheet.canvas,...box,Math.round(x-w/2),Math.round(y-h),w,h);c.restore();
}
export const HOME_SPRITE_PROMPT='Use the supplied image as the identity reference for this exact companion. Create a top-down pixel RPG sprite sheet, exactly FOUR equal columns and FOUR equal rows on a square canvas. Rows in order: DOWN/front, LEFT, RIGHT, UP/back. Columns: walking pose A, neutral, walking pose B, idle blink. Direction is fixed across ALL FOUR columns of each row, including neutral and blink. LEFT means the body and primary face point toward the LEFT EDGE of the image, muzzle left and back of head right; RIGHT means the reverse. Use clearly distinct side silhouettes, never the same front pose for both side rows. UP shows the backs of heads, not front faces. Movement changes only gait, tail/body undulation and subtle bobbing; never turn the primary face to the opposite direction between walking A, neutral and walking B. For multiple heads, preserve the exact head count and their consistent arrangement and gaze across every column of a row; keep the main head a clear direction cue without deleting other heads to simplify a side view. Match the reference species, silhouette, colors, face, markings, accessories and exact number of heads, limbs and wings in every cell. Never add legs to a legless creature: use its own natural slither, bounce or hover anatomy. Each cell contains ONE entire companion at the same scale, centered horizontally, feet or body resting at the same baseline. Keep generous EMPTY padding of at least 12% on EVERY side of every cell. Use compact pixel clusters and a limited palette readable at 32 pixels character height, no antialiasing. Transparent background if supported, otherwise pure white. No scenery, cast shadow, text, letters, labels, borders or grid lines. Exactly 16 separate frames. Before finishing, check all four side-row columns for the same direction and all sixteen cells for the original anatomy and accessories. Preserve identity over embellishment.';

// Validate and isolate cell pixels before accepting a generated sheet. Semantic
// likeness/direction still requires the user's preview; malformed grids are rejected.
export async function readHomeSprite(blob){
 const bitmap=await createImageBitmap(blob);
 try{
  const {width:w,height:h}=bitmap;
  if(w<256||h<256||w>2048||h>2048||w/h<.8||w/h>1.25)throw Error('Invalid sprite sheet size');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(bitmap,0,0);
  const pixels=c.getImageData(0,0,w,h);clearWhiteBorder(pixels.data,w,h);c.putImageData(pixels,0,0);
  // Generated grids can have uneven gutters. Find the sixteen separate silhouettes
  // instead of cutting through a tail at an assumed quarter-cell boundary.
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
  for(let i=0;i<w*h;i++){
   if(seen[i]||pixels.data[i*4+3]<=64)continue;
   let head=0,tail=1,l=i%w,r=l,t=Math.floor(i/w),b=t,count=0;queue[0]=i;seen[i]=1;
   while(head<tail){
    const n=queue[head++],x=n%w,y=Math.floor(n/w);count++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const xx=x+dx,yy=y+dy,j=yy*w+xx;
     if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[j]&&pixels.data[j*4+3]>64){seen[j]=1;queue[tail++]=j;}
    }
   }
   if(count>w*h/1600)parts.push([l,t,r-l+1,b-t+1]);
  }
  if(parts.length!==16)throw Error('Expected sixteen separate sprite frames');
  parts.sort((a,b)=>(a[1]+a[3]/2)-(b[1]+b[3]/2));const frames=[];
  for(let row=0;row<4;row++){
   const group=parts.slice(row*4,row*4+4).sort((a,b)=>a[0]-b[0]);
   const cy=group.map(f=>f[1]+f[3]/2);
   if(Math.max(...cy)-Math.min(...cy)>h/8)throw Error('Invalid sprite rows');
   for(let i=0;i<4;i++){const f=group[i];if(f[0]<2||f[1]<2||f[0]+f[2]>w-2||f[1]+f[3]>h-2||f[2]>w*.32||f[3]>h*.32||(i&&group[i-1][0]+group[i-1][2]>=f[0]))throw Error('Clipped or overlapping frame');}
   frames.push(...group);
  }
  const heights=frames.map(f=>f[3]);if(Math.max(...heights)/Math.min(...heights)>1.8)throw Error('Inconsistent sprite scale');
  return {canvas,frames,maxHeight:Math.max(...heights)};
 }finally{bitmap.close();}
}

export function createHomeSprite(h){
 let pending=null,running=null;
 async function generate(expected){
  const snapshot=await h.active(),old=(await h.anna().storage.get({key:ART})).value||{};
  if(erased(old))throw new ErasedError();
  const source=pixelSource(snapshot,old),owner=snapshot.pet_id,stage=snapshot.stage;
  if(expected&&(expected.pet_id!==owner||expected.stage!==stage))throw Error('Companion changed');
  if(expected?.source_path&&expected.source_path!==source)throw Error('Artwork changed');
  if(currentHomeSprite(snapshot,old)){pending=null;return false;}
  const guard=async()=>{
   const active=await h.active(),saved=(await h.anna().storage.get({key:ART})).value||{};
   if(erased(saved))throw new ErasedError();
   if(active.pet_id!==owner||active.stage!==stage||pixelSource(active,saved)!==source)throw Error('Companion or artwork changed');
  };
  let phase='reference';
  try{
   if(pending&&(pending.owner!==owner||pending.stage!==stage||pending.source!==source)){pending=null;throw Error('Companion changed; start again');}
   if(!pending){
    if(old[requestKey(snapshot)]?.source_path===source)return false;
    await guard();let reference,referencePath=source;
    if(source.startsWith('portraits/'))reference=(await h.anna().files.download_url({path:source})).get_url;
    else{
     const response=await fetch(source);if(!response.ok)throw Error('Reference unavailable');
     referencePath=`portraits/${owner}/home-reference-${crypto.randomUUID()}.png`;await h.upload(referencePath,await response.blob());reference=(await h.anna().files.download_url({path:referencePath})).get_url;
    }
    // Claim this exact artwork before the paid call. Lost responses, concurrent
    // windows and a retried portrait save must not generate the same poses again.
    let claimed=false;
    await mergeSaved(h.anna().storage,ART,latest=>{
     claimed=false;
     if(pixelSource(snapshot,latest||{})!==source)throw Error('Artwork changed');
     if(currentHomeSprite(snapshot,latest)||latest?.[requestKey(snapshot)]?.source_path===source)return latest;
     claimed=true;
     return {...latest,[requestKey(snapshot)]:{path:referencePath,source_path:source,at:Date.now()}};
    });
    if(!claimed)return false;
    await guard();
    phase='generate';
    const result=await h.anna().image.generate({prompt:HOME_SPRITE_PROMPT,reference_image_urls:[reference],n:1,size:'1024x1024',quality:'medium',resolution:'1K',output_format:'png'},{timeoutMs:240000});
    phase='response';
    const url=result?.images?.[0]?.url;if(!url)throw Error('No sprite returned');
    pending={owner,stage,source,url,path:`portraits/${owner}/home-sprite-${crypto.randomUUID()}.png`};
   }
   const p=pending;await guard();
   phase='download';
   if(!p.blob){const response=await fetch(p.url);if(!response.ok)throw Error('Sprite download failed');p.blob=await response.blob();}
   phase='validate';
   if(!p.checked){try{await readHomeSprite(p.blob);p.checked=true;}catch(error){pending=null;throw error;}}
   phase='save';
   await guard();if(!p.uploaded){await h.upload(p.path,p.blob);p.uploaded=true;}
   await guard();
   const art=await mergeSaved(h.anna().storage,ART,latest=>{
    if(pixelSource(snapshot,latest||{})!==source)throw Error('Artwork changed');
    return {...latest,[homeSpriteKey(snapshot)]:{path:p.path,format:'home-sprite-v1',pet_id:owner,stage,source_path:source,at:Date.now()}};
   });
   await guard();pending=null;await h.saved(art);return true;
  }catch(error){
   if(error instanceof ErasedError||/changed/.test(error.message)){pending=null;throw error;}
   // Keep only a bounded stage code; never persist provider messages or signed URLs.
   try{
    await guard();
    const saved=await mergeSaved(h.anna().storage,ART,latest=>{
     if(pixelSource(snapshot,latest||{})!==source)throw Error('Artwork changed');
     if(currentHomeSprite(snapshot,latest)||latest?.[requestKey(snapshot)]?.source_path!==source)throw Error('Request changed');
     return {...latest,[requestKey(snapshot)]:{...latest[requestKey(snapshot)],failure:phase}};
    });
    h.failed?.(saved);
   }catch{/* Diagnostics must never replace the original failure or revive old data. */}
   const failure=new Error('Movement preparation failed');failure.movementPhase=phase;throw failure;
  }
 }
 function sync(expected){if(!running)running=generate(expected).finally(()=>{running=null;});return running;}
 return {sync,retry:()=>pending?sync():Promise.resolve(false),hasPending:()=>!!pending,clear(){pending=null;}};
}
