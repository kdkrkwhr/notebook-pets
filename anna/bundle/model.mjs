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
  if(Number(code)===-32021 || /-32021|storage_token missing/.test(String(error?.message||''))) return t(language,'storageError');
  if(['agent_waking','executa_not_deployed','agent_offline'].includes(code)) return t(language,'runnerError');
  const s=String(error?.message||error);
  if(/quota|balance|credit|insufficient/i.test(s)) return t(language,'quotaError');
  if(/grant|permission|forbidden|not.granted/i.test(s)) return t(language,'permissionError');
  if(/timeout|timed out/i.test(s)) return t(language,'timeoutError');
  return t(language,'genericError');
}
