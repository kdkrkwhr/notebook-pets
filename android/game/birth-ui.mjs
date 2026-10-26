import {checkArtwork,createArtworkEditor,normalizeArtwork} from './birth-art.mjs';
import {currentBirthStep} from './birth-steps.mjs';
import {imageKey} from './model.mjs';
import {t} from './i18n.mjs';
import {createBirthGeneration,birthArtwork} from './local-image-birth.mjs';
import {openBirthDraft} from './birth-draft.mjs';

export async function mountBirthUI({state,call}){
  const $=id=>document.getElementById(id),database=state.testMode?'notebuddy-android-test':'notebuddy-android';
  const draft=await openBirthDraft(database);let sourceURL='',resultURL='',sourceBlob=null,resultBlob=null,ticket=0,sessionEpoch;
  const say=value=>$('birth-generation-status').textContent=value;
  const errorText=e=>e.key?t('ko',e.key):e.message;
  const attempt=async action=>{try{await action();}catch(e){say(errorText(e)+' 자동으로 다시 요청하지 않아요.');}};
  const species={mammal:'포유류',bird:'새',reptile:'파충류',machine:'기계',fairy:'요정',monster:'몬스터',dragon:'용',plant:'식물',ghost:'유령'};
  const element={fire:'불',water:'물',thunder:'번개',nature:'자연',wind:'바람',earth:'땅',light:'빛',dark:'어둠',random:'뚜렷한 속성 없음'};
  function showImage(id,blob,kind){
    if(kind==='source'&&sourceBlob===blob||kind==='result'&&resultBlob===blob)return;
    const old=kind==='source'?sourceURL:resultURL;if(old)URL.revokeObjectURL(old);
    const url=blob?URL.createObjectURL(blob):'';
    if(kind==='source'){sourceURL=url;sourceBlob=blob;}else{resultURL=url;resultBlob=blob;}
    if(url)$(id).src=url;else $(id).removeAttribute('src');
  }
  function render(s){
    const art=$('birth-mode').value==='art';
    document.querySelector('#welcome .birth-choice').hidden=!!s.result;
    $('birth-art-choice').hidden=!art;$('birth-recovery').hidden=!art||!state.imageEnabled;
    $('birth-original-figure').hidden=!art||!s.original;showImage('birth-preview',s.original,'source');
    $('birth-preview').hidden=!s.original;showImage('birth-generated-preview',s.result,'result');
    $('birth-generated-figure').hidden=!s.result;
    $('birth-generation-cancel').hidden=!s.busy;$('birth-generation-discard').hidden=!s.result;
    $('birth-draft-retry').hidden=!s.saveError;
    $('birth-generate').hidden=!!s.result||!!s.assessment&&!s.confirmed;
    $('birth-generate').disabled=s.busy||!s.original||!state.ready||!state.localImageReady||!!s.saveError;
    $('birth-generate').textContent=s.assessment?'확인한 특징으로 다시 만들기':'특징을 살려 친구 만들기';
    for(const id of ['choose-art','choose-photo','import-lab-photo','birth-mode','birth-generation-discard','birth-draft-retry'])$(id).disabled=s.busy;
    $('birth').inert=s.busy;
    $('birth-prepare').hidden=state.ready&&state.localImageReady;
    $('birth-analysis').hidden=!s.assessment;
    if(s.result)$('birth-analysis').open=false;else if(s.assessment&&!s.confirmed)$('birth-analysis').open=true;
    $('birth-analysis-features').textContent=s.assessment?.features??'';
    $('birth-analysis-kind').textContent=s.assessment?`${species[s.assessment.species]} · ${element[s.assessment.element]}${!s.confirmed?' · 확실하지 않아 확인이 필요해요.':''}`:'';
    $('birth-analysis-confirm').hidden=!s.assessment||s.confirmed;$('birth-analysis-confirm').disabled=s.busy;
    const current=s.result?'meet':currentBirthStep({mode:art?'art':'random',artReady:!!s.original,name:$('name').value});
    const order=['mode','name','meet'];for(const li of document.querySelectorAll('#birth-steps [data-step]')){li.dataset.state=order.indexOf(li.dataset.step)<order.indexOf(current)?'done':li.dataset.step===current?'current':'todo';if(li.dataset.step===current)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}
    if(s.saveError)say(s.saveError);
    else if(s.phase==='analyzing')say('그림 속 특징을 살펴보고 있어요. 화면을 열어 두고 기다려 주세요.');
    else if(s.phase==='generating')say('특징을 바탕으로 새 모습을 만들고 있어요. 몇 분 걸릴 수 있어요.');
    else if(s.result)say('원본과 새 모습을 비교해 주세요. 아래에서 이름을 정하고 저장하면 친구가 돼요.');
    else if(s.assessment&&!s.confirmed)say('분석이 확실하지 않아요. 아래 특징을 확인하거나 원본을 다시 골라 주세요.');
  }
  const flow=createBirthGeneration({
    analyze:(blob,signal)=>{if(!state.ready)throw Error('설정에서 기존 모델 파일을 확인해 주세요.');return checkArtwork({llm:{complete:async options=>({content:{text:await call('complete',{...options,json:true},signal)}})}},blob);},
    generate:(image,prompt,signal)=>call('generateImage',{image,prompt},signal),
    encode:blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('원본을 읽지 못했어요.'));r.readAsDataURL(blob);}),
    decode:async data=>{if(typeof data!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data)||data.length>6_000_000)throw Error('생성 결과를 읽지 못했어요.');return (await fetch(data)).blob();},
    persist:value=>draft.save({...value,name:$('name').value,mode:$('birth-mode').value}),changed:render
  });
  const editor=createArtworkEditor({document,tr:key=>t('ko',key),locked:()=>flow.snapshot().busy});
  const selected=blob=>attempt(async()=>{await flow.select(blob);$('notice').textContent='';$('birth-art-status').textContent=state.imageEnabled?'원본을 골랐어요. 이름을 정하고 특징을 살린 친구를 만들어 보세요.':'그림을 골랐어요. 원본 모습으로 친구를 만나요.';say(state.imageEnabled?'모습 만들기를 누르면 분석부터 시작해요.':'');});
  document.addEventListener('artwork-selected',()=>{ticket++;selected(editor.get()?.blob);});
  $('choose-art').onclick=()=>{editor.open();$('art-input-mode').value='draw';$('art-input-mode').dispatchEvent(new Event('change'));};
  $('choose-photo').onclick=()=>{editor.open();$('art-input-mode').value='file';$('art-input-mode').dispatchEvent(new Event('change'));$('art-file').click();};
  $('import-lab-photo').hidden=!state.hasLabPhoto;
  $('import-lab-photo').onclick=()=>attempt(async()=>{const id=++ticket;const data=await call('labPhoto'),blob=await normalizeArtwork(await(await fetch(data)).blob());if(id===ticket)await selected(blob);});
  $('birth-generate').onclick=()=>attempt(()=>flow.run());
  $('birth-analysis-confirm').onclick=()=>attempt(async()=>{await flow.confirm();await flow.run();});
  $('birth-generation-cancel').onclick=()=>{flow.cancel();say('취소하고 있어요. 원본과 확인한 특징은 보관해요.');};
  $('birth-generation-discard').onclick=()=>attempt(()=>flow.select(flow.snapshot().original));
  $('birth-draft-retry').onclick=()=>attempt(()=>flow.retrySave());
  $('birth-prepare').onclick=()=>$('settings-dialog').showModal();
  $('birth-mode').onchange=()=>{render(flow.snapshot());attempt(()=>flow.retrySave());};
  $('name').addEventListener('input',()=>{render(flow.snapshot());attempt(()=>flow.retrySave());});
  window.addEventListener('native-state',()=>render(flow.snapshot()));
  window.addEventListener('native-progress',event=>{const p=event.detail;if(p.kind==='image'&&flow.snapshot().busy)say(p.cancelling?'취소 처리 중이에요.':`${p.steps?`새 모습 만들기 ${p.step}/${p.steps}`:'이미지 모델 준비'} · ${p.elapsedSeconds}초. 화면을 열어 두세요.`);});
  const saved=await draft.load();if(saved){$('name').value=saved.name??'노트버디';$('birth-mode').value=saved.mode==='random'?'random':'art';await attempt(()=>flow.restore(saved));}
  render(flow.snapshot());if(!saved)say(state.ready?'그림을 고르고 모습을 만들어 주세요.':'기존 모델 파일 확인이 필요해요. 설정에서 준비해 주세요.');
  return {
    async session(pet,epoch){if(sessionEpoch!==undefined&&sessionEpoch!==epoch){await flow.clear();await draft.rebase();}sessionEpoch=epoch;},
    cancel(){if(!flow.snapshot().busy)return false;flow.cancel();say('뒤로가기로 작업을 취소했어요. 원본은 그대로예요.');return true;},
    committed:()=>flow.clear(),
    async birth(){
      const s=flow.snapshot();if(s.busy)throw Error('준비가 끝난 뒤 확인해 주세요.');
      if($('birth-mode').value==='random')return {visuals:async()=>({revision:0,art:{},files:{},story:null,chat:[]})};
      if(!s.original)throw Error('먼저 그림을 그리거나 사진을 골라 주세요.');
      if(state.imageEnabled){
        if(!s.result||!s.assessment||s.saveError)throw Error('모습을 만들고 미리보기를 확인해 주세요.');
        await flow.retrySave();
        return {traits:{species:s.assessment.species,element:s.assessment.element},visuals:view=>birthArtwork(s.original,s.result,view,imageKey(view),s.assessment)};
      }
      const {artworkHash}=await import('./local-image-birth.mjs'),hash=await artworkHash(s.original);
      return {visuals:async view=>{const path=`portraits/${view.pet_id}/original.png`;return {revision:0,art:{[imageKey(view)]:{path,hash,at:Date.now()},[`${view.pet_id}/birth-source`]:{path,hash,at:Date.now()}},files:{[path]:s.original},story:null,chat:[]};}};
    }
  };
}
