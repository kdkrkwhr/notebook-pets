import {call,state,status} from './native.js';
export function createAISettings(document){
  const $=id=>document.getElementById(id);let downloading=false;
  function render(){
    if(!downloading)$('native-model-status').textContent=state.ready?'✓ 친구와 대화할 준비가 됐어요':'대화를 준비하는 동안에도 친구를 돌보고 산책할 수 있어요.';
    $('native-download-help').hidden=state.ready;$('native-cancel').hidden=!downloading;
    $('native-download-help').textContent=state.textModelPresent?'이미 있는 파일을 이 휴대폰에서 확인해요. 새 다운로드 없이 확인을 마치면 대화할 수 있어요.':'처음 한 번, 대화에 필요한 파일 2.59GB를 받아요. Wi-Fi에서 받아 주세요. 다른 앱으로 이동하면 멈추며, 돌아와 이어받을 수 있어요.';
    $('native-download').hidden=state.ready||state.textModelPresent;$('native-download').disabled=downloading;
    $('native-verify').hidden=state.ready||!state.textModelPresent;$('native-verify').disabled=downloading;
  }
  window.addEventListener('native-state',render);
  window.addEventListener('native-progress',e=>{if(e.detail.kind==='download')$('native-model-status').textContent=`${e.detail.phase==='verify'?'파일 검증':'다운로드'} ${Math.floor(e.detail.bytes/2588147712*100)}%`;});
  async function prepare(action){if(downloading)return;downloading=true;render();$('native-error').textContent='';try{await call(action);}catch(e){$('native-error').textContent=e.message;}finally{downloading=false;await status().catch(()=>{});render();}}
  $('native-download').onclick=()=>prepare('download');
  $('native-verify').onclick=()=>prepare('verifyModel');
  $('native-cancel').onclick=()=>call('cancel').catch(e=>{$('native-error').textContent=e.message;});
  $('native-licenses').ontoggle=async()=>{if($('native-licenses').open&&!$('native-license-text').textContent)try{$('native-license-text').textContent=await(await fetch('./android-notices.txt')).text();}catch{$('native-license-text').textContent='고지를 읽지 못했어요.';}};
  render();return {settings:()=>({textProvider:'android',ready:state.ready}),lock(){},clear(){}};
}
