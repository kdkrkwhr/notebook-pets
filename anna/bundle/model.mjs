export const actions = {feed:'밥 주기',snack:'간식',play:'놀아 주기',sleep:'재우기',train:'훈련',walk:'산책',battle:'배틀',flee:'지나가기',attendance:'출석 선물',claimquest:'퀘스트 보상',start:'처음 만나기'};
export function unwrap(value) {
  let result=value;
  for(let i=0;i<3;i++) {
    if(result?.data && typeof result.data==='object' && ('success' in result || 'tool' in result)) result=result.data;
    else if(result?.result && typeof result.result==='object' && !('ok' in result)) result=result.result;
    else break;
  }
  if(!result || typeof result.ok!=='boolean') throw new Error('친구의 상태를 읽지 못했어요. 잠시 후 다시 확인해 주세요.');
  return result;
}
export function starter(view){return `assets/${view.species_key}_${view.element_key}_stage1.png`;}
export function imageKey(view, stage=view.stage){return `${view.pet_id}/stage-${stage}`;}
export function normalHistory(value){return Array.isArray(value)?value.filter(x=>['user','assistant'].includes(x?.role)&&typeof x.text==='string').slice(-24).map(x=>({...x,text:x.text.slice(0,3000)})):[];}
export function mergeHistory(existing, additional){return [...new Map([...normalHistory(existing),...normalHistory(additional)].map(x=>[x.id||`${x.role}:${x.text}`,x])).values()].sort((a,b)=>(a.at||0)-(b.at||0)).slice(-24);}
export function errorText(error){
  const s=String(error?.message||error);
  if(/quota|balance|credit|insufficient/i.test(s)) return 'Anna AI 사용량이 부족해요. 계정의 사용량을 확인한 뒤 다시 시도해 주세요.';
  if(/grant|permission|forbidden|not.granted/i.test(s)) return 'Anna에서 앱 실행·저장·AI 권한을 확인해 주세요.';
  if(/timeout|timed out/i.test(s)) return '응답을 기다리다 연결이 끊겼어요. 잠시 후 다시 확인해 주세요.';
  return '요청을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}
