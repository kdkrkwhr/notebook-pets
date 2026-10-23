import {call,state,status} from './native.js';
import {createArtworkEditor,normalizeArtwork} from './birth-art.mjs';
import {imageKey} from './model.mjs';
import {t} from './i18n.mjs';
const $=id=>document.getElementById(id);
try{await status();}catch(e){$('notice').textContent=e.message;}
let imported=null,preview='';
const editor=createArtworkEditor({document,tr:key=>t('ko',key),locked:()=>false});
document.addEventListener('artwork-selected',()=>{imported=null;$('birth-art-status').textContent='이 그림을 그대로 친구의 모습으로 저장해요.';});
$('choose-art').onclick=()=>editor.open();
$('import-lab-photo').hidden=!state.hasLabPhoto;
$('import-lab-photo').onclick=async()=>{
  try{
    const image=await call('labPhoto');
    imported=await normalizeArtwork(await(await fetch(image)).blob());
    if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(imported);$('birth-preview').src=preview;$('birth-preview').hidden=false;
    $('birth-art-status').textContent='검증판 사진을 가져왔어요. 친구 만나기를 누르면 새 게임에 저장해요. 검증판 기록은 그대로 유지돼요.';
  }catch(e){$('birth-art-status').textContent=e.message;}
};
window.NoteBuddyPlatform={
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
  mounted(){
    $('story-usage').textContent='AI 산책 이야기는 휴대폰 모델로 만들어요. 기본 이야기와 결말 선택은 AI를 사용하지 않아요.';
    const hints=document.querySelector('.chat-bottom > small');if(hints)hints.firstChild.textContent='대화는 이 휴대폰에서 실행해요. ';
    if(state.testMode){const note=document.createElement('p');note.id='test-mode';note.textContent='자동 검증용 별도 공책 · 사용자 공책과 분리됨';document.querySelector('main').prepend(note);}
  }
};
window.NoteBuddyBack=()=>{
  const dialogs=[...document.querySelectorAll('dialog[open]')];
  const dialog=dialogs.at(-1);
  if(dialog){const e=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(e))dialog.close();return true;}return false;
};
await import('./app.js');
