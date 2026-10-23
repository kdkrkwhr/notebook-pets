let sequence=0;
const requests=new Map();
export const state={ready:false,hasLabPhoto:false,testMode:false};
if(window.NoteBuddyNative)window.NoteBuddyNative.onmessage=event=>{
  let reply;try{reply=JSON.parse(event.data);}catch{return;}
  const request=requests.get(reply.id);if(!request)return;
  if(reply.progress){window.dispatchEvent(new CustomEvent('native-progress',{detail:reply.progress}));return;}
  requests.delete(reply.id);request.cleanup();
  if(reply.error)request.reject(Error(reply.error));else request.resolve(reply.result);
};
export function call(action,payload={},signal){
  return new Promise((resolve,reject)=>{
    if(!window.NoteBuddyNative){reject(Error('Android 연결을 사용할 수 없어요. 앱을 다시 열어 주세요.'));return;}
    if(signal?.aborted){reject(Error('요청을 취소했어요.'));return;}
    const id=String(++sequence);
    const abort=()=>{if(!requests.has(id))return;requests.delete(id);cleanup();window.NoteBuddyNative.postMessage(JSON.stringify({id:'cancel-'+id,action:'cancel',payload:{target:id}}));reject(Error('요청을 취소했어요. 자동으로 다시 시도하지 않아요.'));};
    const timer=setTimeout(abort,action==='download'?6*60*60*1000:action==='exportFinish'?30*60*1000:180000);
    function cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    requests.set(id,{resolve,reject,cleanup});signal?.addEventListener('abort',abort,{once:true});
    window.NoteBuddyNative.postMessage(JSON.stringify({id,action,payload}));
  });
}
export async function status(){Object.assign(state,await call('status'));window.dispatchEvent(new Event('native-state'));return state;}
