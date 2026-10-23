import {call,state,status} from './native.js';
export function createAISettings(document){
  const $=id=>document.getElementById(id);let downloading=false;
  function render(){
    if(!downloading)$('native-model-status').textContent=state.ready?'✓ 친구와 대화할 준비가 됐어요':'대화를 준비하는 동안에도 친구를 돌보고 산책할 수 있어요.';
    $('native-download-help').hidden=state.ready;$('native-cancel').hidden=!downloading;
    $('native-download').hidden=state.ready;$('native-download').disabled=downloading;
  }
  window.addEventListener('native-state',render);
  window.addEventListener('native-progress',e=>{if(e.detail.kind==='download')$('native-model-status').textContent=`${e.detail.phase==='verify'?'파일 검증':'다운로드'} ${Math.floor(e.detail.bytes/2588147712*100)}%`;});
  $('native-download').onclick=async()=>{if(downloading)return;downloading=true;render();$('native-error').textContent='';try{await call('download');}catch(e){$('native-error').textContent=e.message;}finally{downloading=false;await status().catch(()=>{});render();}};
  $('native-cancel').onclick=()=>call('cancel').catch(e=>{$('native-error').textContent=e.message;});
  $('native-licenses').ontoggle=async()=>{if($('native-licenses').open&&!$('native-license-text').textContent)try{$('native-license-text').textContent=await(await fetch('./android-notices.txt')).text();}catch{$('native-license-text').textContent='고지를 읽지 못했어요.';}};
  render();return {settings:()=>({textProvider:'android',ready:state.ready}),lock(){},clear(){}};
}
