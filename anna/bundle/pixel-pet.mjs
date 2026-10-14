import {ART,ErasedError,mergeSaved} from './data.mjs';
import {imageKey,starter} from './model.mjs';

export const PIXEL_SIZE=64;
export const pixelKey=view=>`${view.pet_id}/pixel-stage-${view.stage}`;
export const pixelSource=(view,art)=>art[imageKey(view)]?.path||starter(view);
export function currentPixel(view,art){
  const entry=art[pixelKey(view)];
  return entry?.format==='pixel-v1'&&entry.source_path===pixelSource(view,art)?entry:null;
}

// Only near-white pixels connected to the outer border are removed. White eyes,
// teeth and highlights enclosed by an outline stay part of the companion.
export function clearWhiteBorder(data,width,height){
  const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
  let head=0,tail=0;
  const add=index=>{
    if(visited[index])return;visited[index]=1;
    const i=index*4;
    if(data[i+3]<16||data[i]>=245&&data[i+1]>=245&&data[i+2]>=245)queue[tail++]=index;
  };
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  while(head<tail){
    const index=queue[head++],x=index%width,y=Math.floor(index/width);data[index*4+3]=0;
    if(x)add(index-1);if(x+1<width)add(index+1);if(y)add(index-width);if(y+1<height)add(index+width);
  }
  return data;
}

export function pixelCanvas(bitmap){
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>16000000)throw Error('Invalid portrait dimensions');
  const source=document.createElement('canvas');
  const scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));
  source.width=Math.max(1,Math.round(bitmap.width*scale));source.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,source.width,source.height);
  const frame=ctx.getImageData(0,0,source.width,source.height);clearWhiteBorder(frame.data,source.width,source.height);ctx.putImageData(frame,0,0);
  let left=source.width,top=source.height,right=-1,bottom=-1;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(frame.data[(y*source.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Empty portrait');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=PIXEL_SIZE;
  const output=canvas.getContext('2d');
  const width=right-left+1,height=bottom-top+1,ratio=(PIXEL_SIZE-8)/Math.max(width,height);
  const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
  output.imageSmoothingEnabled=false;
  output.drawImage(source,left,top,width,height,Math.floor((PIXEL_SIZE-w)/2),PIXEL_SIZE-4-h,w,h);
  const pixels=output.getImageData(0,0,PIXEL_SIZE,PIXEL_SIZE);
  for(let i=0;i<pixels.data.length;i+=4){for(let c=0;c<3;c++)pixels.data[i+c]=Math.round(pixels.data[i+c]/17)*17;pixels.data[i+3]=pixels.data[i+3]<96?0:255;}
  output.putImageData(pixels,0,0);
  return canvas;
}
export async function pixelatePortrait(blob){
  const bitmap=await createImageBitmap(blob);
  try{
    const canvas=pixelCanvas(bitmap);
    return await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Pixel conversion failed')),'image/png'));
  }finally{bitmap.close();}
}

export function createPixelPet(h){
  let pending=null;
  async function sync(snapshot,blob){
    const owner=snapshot.pet_id,stage=snapshot.stage,source=pixelSource(snapshot,h.art());
    const guard=async()=>{
      const active=await h.assertActive();
      if(active.pet_id!==owner||active.stage!==stage)throw Error('Companion changed');
    };
    try{
      await guard();
      if(currentPixel(snapshot,h.art())){h.message('pixelReady');return true;}
      h.message('pixelWorking');
      if(!pending||pending.owner!==owner||pending.stage!==stage||pending.source!==source){
        if(!blob){
          const url=source.startsWith('portraits/')?(await h.anna().files.download_url({path:source})).get_url:source;
          const response=await fetch(url);if(!response.ok)throw Error('Portrait unavailable');blob=await response.blob();
        }
        pending={owner,stage,source,path:`portraits/${owner}/pixel-${crypto.randomUUID()}.png`,blob:await pixelatePortrait(blob)};
      }
      await guard();const p=pending;
      if(!p.uploaded){await h.upload(p.path,p.blob);p.uploaded=true;}
      await guard();
      const saved=await mergeSaved(h.anna().storage,ART,old=>{
        if(pixelSource(snapshot,old||{})!==source)throw Error('Portrait changed');
        return {...old,[pixelKey(snapshot)]:{path:p.path,at:Date.now(),format:'pixel-v1',source_path:source}};
      });
      await guard();h.saved(saved);pending=null;h.message('pixelReady');return true;
    }catch(error){
      if(error instanceof ErasedError)pending=null;
      h.message('pixelFailed');return false;
    }
  }
  return {sync,clear(){pending=null;},hasPending:()=>!!pending};
}
