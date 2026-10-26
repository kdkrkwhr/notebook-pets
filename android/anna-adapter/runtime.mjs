import {call,status} from './native.js';
import './platform.mjs';
import * as store from './store.mjs';

let connected;
export const AnnaAppRuntime={connect:()=>connected??=(connect().catch(e=>{connected=null;throw e;}))};
async function connect(){
 const native=await status(),db=await store.openStore(native.testMode?'notebuddy-android-test':'notebuddy-android');
 const worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'}),pending=new Map();
 let sequence=0,queue=Promise.resolve(),active=null;
 worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.result);};
 worker.onerror=()=>{for(const p of pending.values())p.reject(Error('Local game worker stopped. Saved records are preserved.'));pending.clear();};
 const evaluate=payload=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,payload});});
 async function invoke(request){
  if(!['game','privacy','reset'].includes(request.method))throw Error('Unsupported game method');
  for(let attempt=0;attempt<3;attempt++){
   const row=await store.get(db,store.GAME),r=await evaluate({method:request.method,args:request.args,row});
   if(r.written){try{await store.set(db,store.GAME,r.value,row.etag);}catch(e){if(e.code===-32023&&attempt<2)continue;throw e;}}
   return r.result;
  }
 }
 async function nativeRequest(action,payload,options={}){
  if(active)throw Error('A local AI request is already running.');
  const controller=new AbortController();active=controller;
  const timer=options.timeoutMs?setTimeout(()=>controller.abort(),options.timeoutMs):null;
  try{return await call(action,payload,controller.signal);}
  finally{clearTimeout(timer);if(active===controller)active=null;}
 }
 // Native Back preserves original modal cancel handlers. During inference it
 // cancels only that request; the unchanged Anna failure/retry UI then handles it.
 window.NoteBuddyBack=()=>{
  if(active){active.abort();return true;}
  const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(!dialog)return false;
  if(dialog.dispatchEvent(new Event('cancel',{cancelable:true})))dialog.close();return true;
 };
 const originalFetch=window.fetch.bind(window),uploads=new Map(),urls=new Map();
 const prefix=location.origin+'/__notebuddy_upload__/';
 window.fetch=async(input,init)=>{
  const url=typeof input==='string'?new URL(input,location.href).href:input instanceof URL?input.href:input.url;
  if(!url.startsWith(prefix))return originalFetch(input,init);
  const item=uploads.get(url);
  if(!item||init?.method!=='PUT'||!(init.body instanceof Blob))return new Response('',{status:400});
  store.validateFile(item.path,init.body);
  if(init.body.size!==item.size||init.body.type!==item.type)return new Response('',{status:400});
  item.blob=init.body;return new Response('',{status:200});
 };
 return {
  tools:{invoke(request){const operation=queue.then(()=>invoke(request));queue=operation.catch(()=>{});return operation;}},
  storage:{get:({key})=>store.get(db,key),set:({key,value,if_match})=>store.set(db,key,value,if_match)},
  llm:{async complete(options,transport){
   const state=await status();
   if(!state.ready){if(!state.textModelPresent)throw Error('Existing local Gemma model is missing. No download was attempted.');await nativeRequest('verifyModel',{},transport);}
   const text=await nativeRequest('complete',options,transport);return {content:{text}};
  }},
  image:{async generate(options,transport){
   // Exact original prompt/size/options. No source image, img2img or fallback.
   const capabilities=await status();
   if(!capabilities.textImageReady)throw Error(capabilities.textImageBlockedReason||'1024px local text2img has not been validated. No generation was started.');
   const result=await nativeRequest('generateTextImage',options,transport);
   if(typeof result.image!=='string'||!result.image.startsWith('data:image/png;base64,'))throw Error('Local generation did not return a PNG');
   return {images:[{url:result.image}]};
  }},
  files:{
   async upload_init({path,content_type,size}){store.validatePath(path);if(!['image/png','image/jpeg','image/webp'].includes(content_type)||!Number.isSafeInteger(size)||size<1||size>20_000_000)throw Error('Invalid upload');const url=prefix+crypto.randomUUID();uploads.set(url,{path,type:content_type,size});return {put_url:url,headers:{'Content-Type':content_type}};},
   async upload_finalize({path,size}){const entry=[...uploads].find(([,v])=>v.path===path&&v.size===size&&v.blob);if(!entry)throw Error('Upload was interrupted; original records are preserved.');const result=await store.fileWrite(db,path,entry[1].blob);uploads.delete(entry[0]);return result;},
   async download_url({path}){const r=await store.fileRead(db,path);if(!r)throw store.failure(-32022,'Image not found');let u=urls.get(path);if(u?.etag!==r.etag){if(u)URL.revokeObjectURL(u.url);u={etag:r.etag,url:URL.createObjectURL(r.blob)};urls.set(path,u);}return {get_url:u.url};},
   list:({prefix,limit})=>store.fileList(db,prefix,limit),
   async delete({path,if_match}){await store.fileDelete(db,path,if_match);const u=urls.get(path);if(u)URL.revokeObjectURL(u.url);urls.delete(path);return {};}
  }
 };
}
