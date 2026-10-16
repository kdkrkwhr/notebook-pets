import {ollamaModels,localJSON,validateWorkflow} from './local-ai.js';

export function createAISettings(document,storage){
 const $=id=>document.getElementById(id),prefKey='notebuddy/ai-settings-v1';
 const fields={textProvider:'text-provider',imageProvider:'image-provider',ollamaURL:'ollama-url',ollamaModel:'ollama-model',comfyURL:'comfy-url',model:'model',imageModel:'image-model'};
 const bindings={promptNode:'comfy-prompt-node',promptField:'comfy-prompt-field',referenceNode:'comfy-reference-node',outputNode:'comfy-output-node'};
 let workflow=null,ticket=0,locked=false;const controllers=new Set();
 function select(id,value){const e=$(id);if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===value))e.add(new Option(value,value));e.value=value;}
 try{const p=JSON.parse(storage?.getItem(prefKey)??'{}');for(const [key,id] of Object.entries({...fields,...bindings}))if(typeof p[key]==='string'&&p[key].length<=200){if(['textProvider','imageProvider'].includes(key)&&![...$(id).options].some(o=>o.value===p[key]))continue;select(id,p[key]);}}catch{}
 const binding=()=>Object.fromEntries(Object.entries(bindings).map(([key,id])=>[key,$(id).value.trim()]));
 const settings=()=>({...Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,$(id).value.trim()])),key:$('key').value.trim(),workflow,binding:binding()});
 function save(){try{const {key,workflow,binding:b,...values}=settings();storage?.setItem(prefKey,JSON.stringify({...values,...b}));}catch{}}
 function validate(){try{validateWorkflow(workflow,binding());$('workflow-status').textContent='워크플로 연결을 확인했어요. 실제 생성 품질과 모델 설치 상태는 ComfyUI에서 확인해 주세요.';}catch(e){$('workflow-status').textContent=workflow?e.message:'API 워크플로 파일을 선택해 주세요.';}}
 function render(){
  const c=settings();$('gemini-text-settings').hidden=c.textProvider!=='gemini';$('ollama-settings').hidden=c.textProvider!=='ollama';$('gemini-image-settings').hidden=c.imageProvider!=='gemini';$('comfyui-settings').hidden=c.imageProvider!=='comfyui';$('gemini-key-settings').hidden=c.textProvider!=='gemini'&&c.imageProvider!=='gemini';
 }
 function cancel(){ticket++;for(const c of controllers)c.abort();controllers.clear();}
 for(const id of [...Object.values(fields),...Object.values(bindings)])$(id).addEventListener('change',()=>{cancel();save();render();validate();});
 $('comfy-workflow').onchange=async()=>{
  const turn=++ticket;workflow=null;const file=$('comfy-workflow').files[0];
  try{if(!file||file.size>1000000)throw Error('1MB 이하 API 워크플로 JSON을 선택해 주세요.');const value=JSON.parse(await file.text());if(turn!==ticket)return;workflow=value;validate();}
  catch(e){if(turn===ticket){workflow=null;$('workflow-status').textContent=e.message;}}
 };
 async function connect(button,status,fn){
  if(locked)return;const turn=ticket,controller=new AbortController();controllers.add(controller);$(button).disabled=true;$(status).textContent='로컬 서버를 확인하고 있어요…';
  const timer=setTimeout(()=>controller.abort(),15000);
  try{const result=await fn(controller.signal);if(turn===ticket)$(status).textContent=result;}
  catch(e){if(turn===ticket)$(status).textContent=controller.signal.aborted?'연결 확인 시간이 지났어요. 서버와 사이트 접속 허용 설정을 확인해 주세요.':e.message;}
  finally{clearTimeout(timer);controllers.delete(controller);$(button).disabled=locked;}
 }
 $('connect-ollama').onclick=()=>connect('connect-ollama','ollama-status',async signal=>{
  const models=await ollamaModels($('ollama-url').value,signal);if(signal.aborted)return '';
  const selected=$('ollama-model').value;$('ollama-model').replaceChildren(...models.map(m=>new Option(m,m)));if(models.includes(selected))$('ollama-model').value=selected;save();
  return models.length?`설치된 모델 ${models.length}개를 불러왔어요. 클라우드 모델은 사용할 수 없어요.`:'설치된 모델이 없어요. Ollama에서 대화 모델을 먼저 준비해 주세요.';
 });
 $('connect-comfy').onclick=()=>connect('connect-comfy','comfy-status',async signal=>{const info=await localJSON($('comfy-url').value,'/system_stats',{signal});if(!info.system&&!Array.isArray(info.devices))throw Error('ComfyUI 서버 응답을 확인해 주세요.');return 'ComfyUI에 연결했어요. 워크플로 파일과 노드 번호도 설정해 주세요.';});
 $('local-commands').textContent=`Ollama: OLLAMA_ORIGINS=${location.origin} OLLAMA_NO_CLOUD=1 ollama serve\nComfyUI: python main.py --enable-cors-header ${location.origin} --disable-api-nodes`;
 render();validate();
 return {settings,lock(value){locked=value;for(const e of document.querySelectorAll('#settings-dialog input,#settings-dialog select,#settings-dialog button:not([data-close])'))e.disabled=value;},clear(){cancel();workflow=null;$('comfy-workflow').value='';for(const id of ['ollama-status','comfy-status'])$(id).textContent='';validate();}};
}
