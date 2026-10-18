// Browser -> this computer only. Never forward a Gemini key or fall back to cloud.
import {contentParts} from './gemini.js';
export function localURL(value){
 let url;try{url=new URL(value);}catch{throw Error('로컬 서버 주소를 확인해 주세요.');}
 if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('같은 PC의 localhost 또는 127.0.0.1 주소를 입력해 주세요.');
 return url.origin;
}
export function modelName(value){if(typeof value!=='string'||!value.trim()||value.length>200||/[\x00-\x20?#\\]/.test(value))throw Error('Ollama 모델을 선택해 주세요.');return value;}
export async function localFetch(base,path,options={}){
 try{return await fetch(localURL(base)+path,{...options,credentials:'omit',redirect:'error',cache:'no-store'});}
 catch(error){if(error.name==='AbortError')throw error;throw Error('로컬 서버에 연결하지 못했어요. 실행 상태·사이트 접속 허용(CORS)·브라우저 로컬 네트워크 권한을 확인해 주세요.');}
}
export async function localJSON(base,path,options={}){
 const response=await localFetch(base,path,options);
 if(!response.ok)throw Error(`로컬 서버 요청 실패 (${response.status}). 서버 실행 상태와 선택한 모델·워크플로를 확인해 주세요.`);
 const value=await response.json();if(value?.error)throw Error('로컬 모델이 요청을 처리하지 못했어요. 모델과 서버 로그를 확인해 주세요.');return value;
}
export async function ollamaModels(base,signal){
 const result=await localJSON(base,'/api/tags',{signal});if(!Array.isArray(result.models))throw Error('Ollama 모델 목록 형식을 확인해 주세요.');
 return result.models.slice(0,500).map(m=>modelName(m.name));
}
export async function ollamaText(config,options,signal){
 const model=modelName(config.ollamaModel);
 const details=await localJSON(config.ollamaURL,'/api/show',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model})});
 signal?.throwIfAborted();
 if(details.remote_host||details.remote_model||/:cloud\b|[-:]cloud$/i.test(model))throw Error('로컬 Ollama 모델을 선택해 주세요. 클라우드 모델로 자동 연결하지 않아요.');
 if(Array.isArray(details.capabilities)&&!details.capabilities.includes('completion'))throw Error('텍스트 응답을 지원하는 Ollama 모델을 선택해 주세요.');
 const messages=[{role:'system',content:options.systemPrompt},...options.messages.map(m=>{
  const parts=contentParts(m.content),images=parts.filter(p=>p.inlineData).map(p=>p.inlineData.data);
  if(images.length&&Array.isArray(details.capabilities)&&!details.capabilities.includes('vision'))throw Error('그림 특징 분석에는 비전을 지원하는 로컬 모델이 필요해요.');
  return {role:m.role,content:parts.filter(p=>p.text).map(p=>p.text).join('\n'),...(images.length?{images}:{})};
 })];
 const result=await localJSON(config.ollamaURL,'/api/chat',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,stream:false,think:false,...(options.json?{format:'json'}:{}),options:{temperature:options.temperature??.35,num_predict:options.maxTokens??1024}})});
 if(typeof result.message?.content!=='string'||!result.message.content.trim()||result.message.content.length>32000)throw Error('Ollama의 텍스트 응답이 비어 있거나 너무 커요.');
 return {content:{text:result.message.content}};
}

export function validateWorkflow(graph,binding){
 if(!graph||typeof graph!=='object'||Array.isArray(graph)||Object.keys(graph).length>500)throw Error('ComfyUI의 API 형식 워크플로 JSON을 선택해 주세요.');
 const {promptNode,promptField,referenceNode,outputNode}=binding;
 if(!graph[promptNode]?.inputs||typeof graph[promptNode].inputs[promptField]!=='string'||referenceNode&&(graph[referenceNode]?.class_type!=='LoadImage'||typeof graph[referenceNode]?.inputs?.image!=='string')||!['SaveImage','PreviewImage'].includes(graph[outputNode]?.class_type))throw Error('프롬프트 노드/입력 필드·LoadImage 노드·SaveImage 출력 노드 번호를 확인해 주세요.');
 const visited=new Set();function visit(id){if(visited.has(id))return;visited.add(id);for(const value of Object.values(graph[id]?.inputs??{}))if(Array.isArray(value)&&value.length===2&&typeof value[1]==='number'&&graph[String(value[0])])visit(String(value[0]));}visit(outputNode);
 if(!visited.has(promptNode)||referenceNode&&!visited.has(referenceNode))throw Error('선택한 출력에 프롬프트와 참고 그림이 모두 연결돼 있어야 해요.');
 if(!referenceNode&&[...visited].some(id=>graph[id]?.class_type==='LoadImage'))throw Error('텍스트 기반 워크플로의 출력에는 LoadImage를 연결할 수 없어요.');
 return graph;
}
const safeFile=value=>typeof value==='string'&&!!value&&!/[\\\x00-\x1f]/.test(value)&&!value.startsWith('/')&&value.split('/').every(p=>p&&p!=='.'&&p!=='..');
export async function comfyImage(config,options,signal){
 validateWorkflow(config.workflow,config.binding);
 const references=options.reference_image_urls??[];
 const graph=structuredClone(config.workflow),b=config.binding;
 if(!references.length&&b.referenceNode)throw Error('진화 그림은 텍스트 기반 워크플로가 필요해요. LoadImage 없이 연결하고 참고 그림 노드 번호를 비워 주세요.');
 if(references.length){
 if(!b.referenceNode)throw Error('마이홈 그림에는 참고 그림 LoadImage 노드가 연결된 워크플로가 필요해요.');
 if(references.length!==1||!references[0].startsWith('blob:'))throw Error('현재 친구의 로컬 참고 그림 한 장이 필요해요.');
 const reference=await fetch(references[0],{signal});if(!reference.ok)throw Error('참고 그림을 읽지 못했어요.');const blob=await reference.blob();
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>20000000)throw Error('참고 그림 형식을 확인해 주세요.');
 const form=new FormData();form.append('image',blob,`notebuddy-${crypto.randomUUID()}.${blob.type==='image/png'?'png':blob.type==='image/jpeg'?'jpg':'webp'}`);form.append('type','input');
 const uploaded=await localJSON(config.comfyURL,'/upload/image',{method:'POST',body:form,signal});
 if(!safeFile(uploaded.name)||uploaded.name.includes('/')||uploaded.subfolder&&!safeFile(uploaded.subfolder))throw Error('ComfyUI의 참고 그림 업로드 결과를 확인해 주세요.');
 graph[b.referenceNode].inputs.image=[uploaded.subfolder,uploaded.name].filter(Boolean).join('/');
 }
 graph[b.promptNode].inputs[b.promptField]=options.prompt;
 // One submission only. A lost reply or timeout must never enqueue a second job.
 const job=await localJSON(config.comfyURL,'/prompt',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:graph,client_id:crypto.randomUUID()})});
 if(typeof job.prompt_id!=='string'||!job.prompt_id||job.prompt_id.length>128||job.node_errors&&Object.keys(job.node_errors).length)throw Error('ComfyUI가 워크플로를 수락하지 않았어요. 모델과 노드 설정을 확인해 주세요.');
 for(let attempt=0;attempt<240;attempt++){
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const history=await localJSON(config.comfyURL,'/history/'+encodeURIComponent(job.prompt_id),{signal}),entry=history[job.prompt_id];
  if(entry?.status?.status_str==='error')throw Error('ComfyUI 이미지 생성이 실패했어요. 워크플로와 서버 로그를 확인해 주세요.');
  const images=entry?.outputs?.[b.outputNode]?.images;
  if(images){
   if(images.length!==1||!safeFile(images[0]?.filename)||images[0].filename.includes('/')||images[0].subfolder&&!safeFile(images[0].subfolder)||!['output','temp'].includes(images[0].type))throw Error('선택한 출력 노드에서 시트 이미지 한 장만 반환해야 해요.');
   const query=new URLSearchParams({filename:images[0].filename,subfolder:images[0].subfolder??'',type:images[0].type});
   const response=await localFetch(config.comfyURL,'/view?'+query,{signal});
   if(!response.ok)throw Error('ComfyUI 결과 그림을 받지 못했어요.');
   const image=await response.blob();if(image.size>20000000||!['image/png','image/jpeg','image/webp'].includes(image.type))throw Error('ComfyUI 결과 그림이 너무 크거나 지원하지 않는 형식이에요.');
   return image;
  }
  if(entry?.status?.completed)throw Error('선택한 ComfyUI 출력 노드에 이미지가 없어요.');
  await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1000);signal.addEventListener('abort',abort,{once:true});});
 }
 throw Error('ComfyUI 대기 시간이 지났어요. 자동으로 다시 생성하지 않아요.');
}
