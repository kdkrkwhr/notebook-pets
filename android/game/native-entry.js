import {call,state,status} from './native.js';
import {createArtworkEditor,normalizeArtwork} from './birth-art.mjs';
import {imageKey} from './model.mjs';
import {t} from './i18n.mjs';
import {mountMobile,chatStarted,chatFinished,chatReceived} from './mobile-shell.js';
import {createDrafts} from './drafts.js';
const $=id=>document.getElementById(id);
for(const root of document.querySelectorAll('main,.masthead'))root.inert=true;
const startupTimer=setTimeout(()=>{
  $('native-startup-detail').textContent='준비가 조금 늦어지고 있어요. 잠시 더 기다리거나 화면을 다시 열어 주세요.';
  $('native-reopen').hidden=false;
},30000);
$('native-reopen').onclick=()=>location.reload();
function startupFailed(){clearTimeout(startupTimer);$('native-startup-heading').textContent='공책을 열지 못했어요';$('native-startup-detail').textContent='저장된 친구는 지우지 않았어요. 화면을 다시 열어 주세요.';$('native-reopen').hidden=false;}
try{await status();}catch(e){$('notice').textContent=e.message;}
let imported=null,preview='',selectionVersion=0;
let preferences;try{preferences=window.localStorage;}catch{}
const drafts=createDrafts(document,preferences,state.testMode?'notebuddy-android-test':'notebuddy-android');
const editor=createArtworkEditor({document,tr:key=>t('ko',key),locked:()=>false});
document.addEventListener('artwork-selected',()=>{selectionVersion++;imported=null;$('birth-art-status').textContent='그림을 골랐어요. 이름을 지어 친구를 만나 보세요.';});
$('choose-art').onclick=()=>{editor.open();$('art-input-mode').value='draw';$('art-input-mode').dispatchEvent(new Event('change'));};
$('choose-photo').onclick=()=>{editor.open();$('art-input-mode').value='file';$('art-input-mode').dispatchEvent(new Event('change'));$('art-file').click();};
$('import-lab-photo').hidden=!state.hasLabPhoto;
$('import-lab-photo').onclick=async()=>{
  const ticket=++selectionVersion;$('import-lab-photo').disabled=true;
  try{
    const image=await call('labPhoto');
    const blob=await normalizeArtwork(await(await fetch(image)).blob());if(ticket!==selectionVersion)return;imported=blob;
    if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(imported);$('birth-preview').src=preview;$('birth-preview').hidden=false;
    $('birth-art-status').textContent='이전에 고른 사진을 가져왔어요. 친구에게 이름을 지어 주세요.';
  }catch(e){if(ticket===selectionVersion)$('birth-art-status').textContent=e.message;}
  finally{$('import-lab-photo').disabled=false;}
};
window.NoteBuddyPlatform={
  skipTitleScreen:true,
  chatStarted,chatFinished,chatReceived,
  actionMessage(message){
    const actions={'feed 완료':'밥을 맛있게 먹었어요.','snack 완료':'간식을 즐겁게 먹었어요.','play 완료':'함께 즐겁게 놀았어요.','sleep 완료':'편안하게 쉬었어요.'};
    const trained=/^(hp|atk|def|spd) 훈련 완료$/.exec(message),stats={hp:'체력',atk:'공격력',def:'방어력',spd:'속도'};
    return actions[message]??(trained?`${stats[trained[1]]} 훈련을 마쳤어요.`:message);
  },
  beforeSessionClear:()=>drafts.write(),sessionChanged:(pet,epoch)=>drafts.session(pet,epoch),chatCommitted:()=>drafts.clear(),
  imageGeneration:false,databaseName:state.testMode?'notebuddy-android-test':'notebuddy-android',
  async birth(){
    const blob=imported??editor.get()?.blob;
    if(!blob)throw Error('먼저 그림을 그리거나 사진을 골라 주세요.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
    return {visuals:async view=>{const path=`portraits/${view.pet_id}/original.png`;return {revision:0,art:{[imageKey(view)]:{path,hash,at:Date.now()},[`${view.pet_id}/birth-source`]:{path,hash,at:Date.now()}},files:{[path]:blob},story:null,chat:[]};}};
  },
  async exportNotebook(backup){
    const data=JSON.stringify(backup);
    if(new TextEncoder().encode(data).length>55000000)throw Error('백업은 55MB 이하여야 해요.');
    await call('exportBegin');
    try{for(let at=0;at<data.length;at+=128000)await call('exportChunk',{text:data.slice(at,at+128000)});await call('exportFinish');}
    catch(e){await call('exportCancel').catch(()=>{});throw e;}
  },
  mounted({ready=true}={}){
    if(!ready){startupFailed();return;}
    clearTimeout(startupTimer);
    $('story-usage').hidden=true;
    const hints=document.querySelector('.chat-bottom > small');if(hints)hints.hidden=true;
    mountMobile();if(state.testMode)document.querySelector('.brand small').textContent='테스트 공책';for(const root of document.querySelectorAll('main,.masthead'))root.inert=false;$('native-startup').remove();
  }
};
window.NoteBuddyBack=()=>{
  const dialogs=[...document.querySelectorAll('dialog[open]')];
  const dialog=dialogs.at(-1);
  if(dialog){const e=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(e))dialog.close();return true;}return false;
};
try{await import('./app.js');}catch(error){console.error('NoteBuddy Android startup',error);startupFailed();}
