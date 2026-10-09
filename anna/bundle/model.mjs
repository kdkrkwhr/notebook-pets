import {t} from './i18n.mjs';
export function unwrap(value) {
  let result=value;
  for(let i=0;i<3;i++) {
    if(result?.data && typeof result.data==='object' && ('success' in result || 'tool' in result)) result=result.data;
    else if(result?.result && typeof result.result==='object' && !('ok' in result)) result=result.result;
    else break;
  }
  if(!result || typeof result.ok!=='boolean') throw new Error('Invalid game response');
  return result;
}
export function starter(view){return `assets/${view.species_key}_${view.element_key}_stage1.png`;}
export function imageKey(view, stage=view.stage){return `${view.pet_id}/stage-${stage}`;}
export function normalHistory(value){return Array.isArray(value)?value.filter(x=>['user','assistant'].includes(x?.role)&&typeof x.text==='string').slice(-24).map(x=>({...x,text:x.text.slice(0,3000)})):[];}
export function mergeHistory(existing, additional){return [...new Map([...normalHistory(existing),...normalHistory(additional)].map(x=>[x.id||`${x.role}:${x.text}`,x])).values()].sort((a,b)=>(a.at||0)-(b.at||0)).slice(-24);}
export function errorText(error,language='en'){
  const code=error?.details?.jsonrpc_code ?? error?.code;
  if([-32024,-32025].includes(Number(code))) return t(language,'saveQuotaError');
  if(Number(code)===-32021 || /-32021|storage_token missing/.test(String(error?.message||''))) return t(language,'storageError');
  if(['agent_waking','executa_not_deployed','agent_offline'].includes(code)) return t(language,'runnerError');
  const s=String(error?.message||error);
  if(/quota|balance|credit|insufficient/i.test(s)) return t(language,'quotaError');
  if(/grant|permission|forbidden|not.granted/i.test(s)) return t(language,'permissionError');
  if(/timeout|timed out/i.test(s)) return t(language,'timeoutError');
  return t(language,'genericError');
}

export function newAction(view,command,extra={},id=()=>crypto.randomUUID()) {
  if(!/^nb2:(0|[1-9][0-9]{0,15}):$/.test(view?.request_id_prefix||'')) throw new Error('Refresh the app before choosing an action');
  return {...extra,command,request_id:view.request_id_prefix+id()};
}
