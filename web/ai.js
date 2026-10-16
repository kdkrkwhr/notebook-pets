import {createGemini} from './gemini.js';
import {ollamaText,comfyImage,validateWorkflow,localURL} from './local-ai.js';

export function imageReady(config){
 if(config.imageProvider!=='comfyui')return !!config.key;
 try{localURL(config.comfyURL);validateWorkflow(config.workflow,config.binding);return true;}catch{return false;}
}
export function createAI(settings){
 const gemini=createGemini(settings),controllers=new Set(),urls=new Set();let closed=false;
 async function run(fn,timeout,signal){
  if(closed)throw Error('Companion changed');
  const controller=new AbortController(),abort=()=>controller.abort();controllers.add(controller);
  if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeout);
  try{controller.signal.throwIfAborted();const value=await fn(controller.signal);controller.signal.throwIfAborted();if(closed)throw Error('Companion changed');return value;}
  catch(e){if(e.name==='AbortError')throw Error('로컬 AI 요청을 취소했거나 대기 시간이 지났어요. 자동으로 다시 요청하지 않아요.');throw e;}
  finally{clearTimeout(timer);controllers.delete(controller);signal?.removeEventListener('abort',abort);}
 }
 async function text(options,{signal}={}){
  if(closed)throw Error('Companion changed');const config=settings();
  return config.textProvider==='ollama'?run(s=>ollamaText(config,options,s),120000,signal):gemini.llm.complete(options,{signal});
 }
 return {
  text,
  llm:{complete:options=>text({...options,json:true})},
  image:{async generate(options){
   if(closed)throw Error('Companion changed');const config=settings();
   if(config.imageProvider!=='comfyui')return gemini.image.generate(options);
   return run(async signal=>{const blob=await comfyImage(config,options,signal);if(closed||signal.aborted)throw Error('Companion changed');const url=URL.createObjectURL(blob);urls.add(url);return {images:[{url}]};},240000);
  }},
  clear(){closed=true;gemini.clear();for(const c of controllers)c.abort();for(const url of urls)URL.revokeObjectURL(url);controllers.clear();urls.clear();}
 };
}
