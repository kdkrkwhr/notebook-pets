let sequence=0;const session=crypto.randomUUID();
const requests=new Map();
export const state={ready:false,hasLabPhoto:false,testMode:false,imageEnabled:false,localImageReady:false,textModelPresent:false};
if(window.NoteBuddyNative)window.NoteBuddyNative.onmessage=event=>{
  let reply;try{reply=JSON.parse(event.data);}catch{return;}
  const request=requests.get(reply.id);if(!request)return;
  if(reply.progress){window.dispatchEvent(new CustomEvent('native-progress',{detail:reply.progress}));if(request.action==='complete')window.dispatchEvent(new CustomEvent('native-ai',{detail:{id:reply.id,...reply.progress}}));return;}
  requests.delete(reply.id);request.cleanup();
  if(reply.error)request.reject(Error(reply.error));else request.resolve(reply.result);
};
export function call(action,payload={},signal){
  return new Promise((resolve,reject)=>{
    if(!window.NoteBuddyNative){reject(Error('Android 연결을 사용할 수 없어요. 앱을 다시 열어 주세요.'));return;}
    if(signal?.aborted){reject(Error('요청을 취소했어요.'));return;}
    const id=session+'-'+(++sequence);
    function stop(message){if(!requests.has(id))return;requests.delete(id);cleanup();try{window.NoteBuddyNative.postMessage(JSON.stringify({id:'cancel-'+id,action:'cancel',payload:{target:id}}));}catch{}reject(Error(message));}
    const abort=()=>stop('답장을 멈췄어요.');
    const timer=setTimeout(()=>stop('요청 시간이 길어져 멈췄어요. 입력한 내용은 남아 있어요. 준비 상태를 확인하고 다시 시도해 주세요.'),action==='download'?6*60*60*1000:action==='exportFinish'?30*60*1000:action==='generateImage'?11*60*1000:180000);
    function cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',abort);if(action==='complete')window.dispatchEvent(new CustomEvent('native-ai',{detail:{id,phase:'end'}}));}
    requests.set(id,{resolve,reject,cleanup,action,abort});signal?.addEventListener('abort',abort,{once:true});
    if(action==='complete')window.dispatchEvent(new CustomEvent('native-ai',{detail:{id,phase:'start'}}));
    try{window.NoteBuddyNative.postMessage(JSON.stringify({id,action,payload}));}
    catch{requests.delete(id);cleanup();reject(Error('요청을 전달하지 못했어요. 입력한 내용을 확인하고 다시 시도해 주세요.'));}
  });
}
export function cancelAI(){for(const r of [...requests.values()])if(r.action==='complete')r.abort();}
export async function status(){Object.assign(state,await call('status'));window.dispatchEvent(new Event('native-state'));return state;}
