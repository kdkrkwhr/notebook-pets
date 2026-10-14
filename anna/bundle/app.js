import {createItemCatalog} from './item-catalog.mjs';
import {createPersonality,axes as personalityAxes} from './personality.mjs';
import {checkArtwork} from './birth-art.mjs';
let persona,personalityFeedback='',personalityWorking=false;
import {createStoryDialog} from './walk-story-dialog.mjs';
import {createWalkStories,storyEvent} from './walk-stories.mjs';
let stories,storyDialog;
import {createArtworkEditor,artworkGrowthPrompt} from './birth-art.mjs';
import {createBirthFlow} from './birth-flow.mjs';
let birth,artEditor;
import {createReactions,reactionEvent} from './reactions.mjs';
let reactions;
import {createBattle} from './battle.mjs';
import {createDungeons} from './dungeon.mjs';
import {createPixelPet,currentPixel,pixelKey} from './pixel-pet.mjs';
import { AnnaAppRuntime } from '/static/anna-apps/_sdk/latest/index.js';
import {unwrap,starter,imageKey,mergeHistory,errorText,newAction} from './model.mjs';
import {t,loadLanguage,saveLanguage,translateDocument,chatPrompt} from './i18n.mjs';

import {finishReset} from './reset-data.mjs';
import {cleanUnusedPortraits} from './portraits.mjs';

const $=selector=>document.querySelector(selector);
const TOOL=window.__ANNA_TOOL_IDS__?.notebuddy||'tool-dev-notebuddy';
import {CHAT,ART,ErasedError,mergeSaved,removeAppData} from './data.mjs';
// Accessing localStorage itself can throw in a restricted iframe.
let preferences;
try{preferences=window.localStorage;}catch{preferences=null;}
let language=loadLanguage(preferences);
const itemCatalog=createItemCatalog(document,()=>language);
let anna,view=null,busy=false,history=[],art={},urls={},pendingAction=null,pendingImage=null,pendingChat=null;
let removalPreview=null,pendingRemoval=false,resetPreview=null,pendingResetRequest=null;
const tr=(key,values)=>t(language,key,values);
const problem=error=>errorText(error,language);
const battleScene=createBattle(document,()=>storyDialog.close(),()=>storyDialog.battleFinished());
let dungeons,pixels,pixelNotice='';
$('#draw-evolved').addEventListener('click',()=>$('#draw').click());

function notice(message=''){ $('#notice').textContent=message;$('#notice').hidden=!message; }
function controls(value){
  busy=value;
  document.querySelectorAll('button,input,select').forEach(e=>e.disabled=value);
  if(!value&&(!anna||pendingRemoval||pendingAction||pendingResetRequest||view?.reset_pending))document.querySelectorAll('[data-action],#start-form button,#chat-form button,#chat-input,#draw').forEach(e=>e.disabled=true);
  $('#retry-chat').hidden=!pendingChat;
  $('#retry-reaction').hidden=!reactions?.hasUnsaved();
  if(!value&&pendingChat)document.querySelectorAll('#chat-form button,#chat-input').forEach(e=>e.disabled=true);
  if(!value&&(!anna||pendingRemoval||pendingAction||pendingImage||birth?.hasOutput()||pixels?.hasPending()))$('#clean-portraits').disabled=true;
  if(!value&&(pendingRemoval||pendingAction))$('#retry-chat').disabled=true;
  if(!value&&anna&&!pendingRemoval&&!pendingAction&&!pendingResetRequest&&!view?.reset_pending&&view?.status)$('#claimquest').disabled=!view.status.quest?.ready;
  birth?.render();stories?.render();dungeons?.render();renderPixel();renderPersonality();
}
function text(id,value){$(id).textContent=String(value??'');}
function picture(img,src,fallback){img.onerror=()=>{img.onerror=null;img.src=fallback;};img.src=src;}
function translate(){
  translateDocument(document,language);$('#language').value=language;
  itemCatalog.render();
  if(birthNotice)birthMessage(birthNotice.key,birthNotice.values);
  text('#draw',tr(pendingImage?'retryImage':'draw'));
}
function drawChat(){
  const container=$('#messages');container.replaceChildren();container.dataset.reactionBusy=String(reactions?.isWorking()||false);
  const transcript=mergeHistory(history,reactions?.messages()||[]);
  $('#retry-reaction').hidden=!reactions?.hasUnsaved();
  if(!transcript.length){const p=document.createElement('p');p.className='message';p.textContent=tr('chatEmpty');container.append(p);}
  for(const item of transcript){
    const p=document.createElement('div');p.className=`message ${item.role}${item.kind==='activity'?' activity':''}`;
    const label=document.createElement('div');label.className='message-label';
    label.textContent=item.role==='user'?tr('you'):view?.status?.name||tr('friend');
    const content=item.kind==='reaction'&&item.state!=='done'?tr(item.state==='failed'?'reactionBubbleFailed':reactions?.messages().some(x=>x.id===item.id)?'reactionWorking':'reactionInterrupted',{name:view?.status?.name||tr('friend')}):item.text;
    if(item.kind==='reaction'){p.dataset.reactionState=item.state;if(item.state==='pending')p.classList.add('reaction-pending');}
    p.append(label,document.createTextNode(content));container.append(p);
  }
  reactionFeedback(reactionNotice);
  container.scrollTop=container.scrollHeight;
}
function previousPortrait(v){for(let stage=v.stage-1;stage>=1;stage--){const url=urls[imageKey(v,stage)];if(url)return url;}return starter(v);}
function pixelUrl(){return view?.status&&currentPixel(view,art)?urls[pixelKey(view)]:null;}
function renderPixel(){
  const url=pixelUrl(),img=$('#pixel-pet');img.hidden=!url;$('#pixel-empty').hidden=!!url;
  if(url){img.src=url;img.alt=view.status.name;}
  else img.removeAttribute('src');
  text('#pixel-status',tr(pixelNotice||(url?'pixelReady':'pixelMissing')));
  $('#prepare-pixel').hidden=!!url&&pixelNotice!=='pixelFailed';
  $('#prepare-pixel').disabled=busy||!view?.status||!!(pendingAction||pendingRemoval||pendingResetRequest||pendingImage)||birth?.hasOutput();
}
async function preparePixel(){
  if(busy||pendingAction||pendingRemoval||pendingResetRequest||pendingImage||birth?.hasOutput()||!view?.status)return;
  controls(true);
  try{const snapshot=await assertActive();await pixels.sync(snapshot);await readExtras();render();}
  catch{pixelNotice='pixelFailed';renderPixel();}
  finally{controls(false);}
}
let walkSnapshot=null,walkSnapshotAt=0;
function renderWalkEnergy(){
  const energy=view?.status?.walk_energy;
  if(!energy){text('#walk-energy',tr('walkHint'));return;}
  if(energy!==walkSnapshot){walkSnapshot=energy;walkSnapshotAt=performance.now();}
  const elapsed=Math.max(0,(performance.now()-walkSnapshotAt)/1000);
  const added=energy.charges<energy.capacity&&elapsed>=energy.next_in_seconds?1+Math.floor((elapsed-energy.next_in_seconds)/energy.recharge_seconds):0;
  const charges=Math.min(energy.capacity,energy.charges+added);
  text('#walk-energy',tr('walkEnergy',{...energy,charges}));
}
setInterval(renderWalkEnergy,1000);
function render(){
  document.body.classList.toggle('has-pet',!!view?.status);
  const resetting=!!(view?.reset_pending||pendingResetRequest);
  $('#resetting').hidden=!resetting;
  if(resetting)forgetCachedData();
  const s=resetting?null:view?.status;
  $('#removed').hidden=!view?.erased;
  $('#reset-game').hidden=resetting||!s;
  if(view?.erased)forgetCachedData();
  $('#welcome').hidden=resetting||!!s||view?.code!=='not_started';$('#game').hidden=!s;
  if(!s){birth?.render();return;}
  renderPersonality();
  text('#name',s.name);text('#pet-type',`${s.species} · ${s.element}`);text('#mood',`◌ ${s.mood}`);
  renderWalkEnergy();
  text('#title',s.title);text('#level',`Lv. ${s.level}`);text('#stage-label',s.stage_label);
  text('#xp-label',`${s.xp} / ${s.xp_next} XP`);$('#xp').max=s.xp_next;$('#xp').value=s.xp;
  for(const key of ['satiety','intimacy']){text(`#${key}`,`${s[key]} / 100`);$(`#${key}-bar`).value=s[key];}
  text('#stats',tr('stats',{...s.stats,...s.record,draw:s.record.draw||0}));
  text('#inventory',tr('inventory',{food:view.inventory.normal_feed,rare:view.inventory.rare_feed}));
  $('#setup-birth').hidden=view.stage!==1||!!art[`${view.pet_id}/birth-source`]||!!art[imageKey(view,1)];
  const image=urls[imageKey(view)];picture($('#pet-image'),image||starter(view),starter(view));
  $('#pet-image').alt=`${s.name}, ${s.species} ${s.element} ${s.stage_label}`;
  text('#image-caption',tr(image?'portrait':view.stage>1?'oldPortrait':'firstPortrait'));
  const q=s.quest;text('#quest-date',q.date);$('#quests').replaceChildren();
  for(const task of q.tasks){
    const li=document.createElement('li');li.className=task.complete?'done':'';
    const progress=document.createElement('span');progress.textContent=`${task.progress} / ${task.target}`;
    li.append(document.createTextNode(`${task.complete?'✓':'○'}  ${task.label}`),progress);$('#quests').append(li);
  }
  text('#claimquest',q.claimed?tr('claimed'):tr('reward',{xp:q.reward.xp,rare:q.reward.rare_feed}));$('#claimquest').disabled=busy||!q.ready;
  $('#encounter').hidden=!s.encounter;if(s.encounter)text('#encounter-text',tr('encounter',s.encounter));
  if(s.encounter){picture($('#encounter-own'),image||starter(view),starter(view));picture($('#encounter-enemy'),starter(s.encounter),'icon.svg');$('#encounter-own').alt=s.name;$('#encounter-enemy').alt=s.encounter.species;}
  $('#evolution-note').hidden=view.stage<2||!!image;
  $('#album').replaceChildren();
  for(const entry of view.album.entries){
    const item=document.createElement('div');item.className='album-item';
    const frame=document.createElement('div');frame.className='album-image';
    if(entry.reached){const img=document.createElement('img');img.alt=entry.label;picture(img,urls[imageKey(view,entry.stage)]||starter(view),starter(view));frame.append(img);}else frame.textContent='?';
    const title=document.createElement('div');title.textContent=entry.label;
    const subtitle=document.createElement('small');subtitle.textContent=entry.reached?tr(entry.current?'currentStage':'memoryStage'):tr('futureStage',{level:entry.min_level});
    item.append(frame,title,subtitle);$('#album').append(item);
  }
  drawChat();birth?.render();stories?.render();dungeons?.render();renderPixel();renderPersonality();
}
function forgetCachedData(){
  persona?.clear();
  pixels?.clear();pixelNotice='';dungeons?.close();$('#pixel-pet').removeAttribute('src');$('#pixel-pet').hidden=true;
  birth?.clear();stories?.clear();storyDialog?.clear();
  reactions?.clear();reactionFeedback();
  battleScene.close();
  history=[];art={};urls={};pendingAction=null;pendingImage=null;pendingChat=null;
  $('#messages').replaceChildren();$('#album').replaceChildren();$('#quests').replaceChildren();
  for(const id of ['name','pet-type','title','action-result','pet-name','chat-input','mood','level','stage-label','xp-label','satiety','intimacy','stats','inventory','image-caption','quest-date','encounter-text']){const e=$(`#${id}`);if('value' in e)e.value='';else e.textContent='';}
  for(const e of document.querySelectorAll('#game progress'))e.value=0;
  $('#encounter').hidden=true;
  $('#pet-image').onerror=null;$('#pet-image').src='icon.svg';$('#pet-image').alt='';
  $('#retry-action').hidden=true;$('#retry-chat').hidden=true;
}
class PartnerChangedError extends Error {}
// Pending work belongs to the companion shown when it started. Never merge
// that work into a different companion after another window completes reset.
function adoptView(next){
  const changed=!!(view?.pet_id&&next?.pet_id&&view.pet_id!==next.pet_id);
  if(changed)forgetCachedData();
  view=next;
  return changed;
}
async function assertActive(){
  const status=await invoke('status');
  if(view?.pet_id&&status.pet_id&&view.pet_id!==status.pet_id){adoptView(status);render();throw new PartnerChangedError();}
  if(status.erased){view=status;render();throw new ErasedError();}
  if(status.reset_pending){view=status;render();throw new Error('Reset pending');}
  if(!status.status)throw new Error('No active game');
  return status;
}
async function readExtras(){
  if(view?.erased||view?.reset_pending||pendingResetRequest){forgetCachedData();return;}

  const results=await Promise.allSettled([anna.storage.get({key:CHAT}),anna.storage.get({key:ART})]);
  if(results[0].status==='fulfilled')history=mergeHistory(results[0].value.value,pendingChat||[]);
  if(results[1].status==='fulfilled')art=results[1].value.value||{};
  if(results.some(r=>r.status==='rejected'))notice(tr('extrasError'));
  await stories?.load(view);
  urls={};await Promise.all(Object.entries(art).filter(([key])=>key.startsWith(`${view?.pet_id}/`)&&!key.endsWith('/birth-source')).map(async([key,entry])=>{try{urls[key]=(await anna.files.download_url({path:entry.path})).get_url;}catch{/* Keep the bundled portrait visible. */}}));
}
async function invoke(command,extra={}){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'game',args:{command,...extra,language}}, {timeoutMs:60000}));}
async function refresh(){
  if(busy)return;controls(true);notice();
  try{
    anna??=await AnnaAppRuntime.connect();
    adoptView(await invoke('status'));if(!view.ok&&view.code!=='not_started')notice(view.msg);
    if(view.erased||view.status||view.code==='not_started')pendingRemoval=false;await readExtras();render();text('#connection',tr('connected'));
    if(pendingAction)notice(tr('uncertain'));
  }catch(error){notice(problem(error));text('#connection',tr('disconnected'));}
  finally{controls(false);}
}
async function act(command,extra={},retry=false){
  if(busy||pendingRemoval||(!retry&&pendingAction))return;
  if(command==='walk'&&!retry&&storyDialog.hasPending()){storyDialog.resume();return;}
  if(command==='walk')command='walk_begin';
  const outing=['walk_begin','walk_collect','walk_leave','battle','flee'].includes(command);
  if(outing)storyDialog.loading();
  controls(true);notice();
  if(!retry){try{pendingAction=newAction(view,command,extra);}catch{notice(tr('refreshAction'));if(outing)storyDialog.result(tr('refreshAction'));controls(false);return;}}
  let started=false,reaction=null,walkStory=null;
  $('#retry-action').hidden=true;text('#action-result',tr('working'));
  try{
    const before=view;const portrait=urls[imageKey(before)];
    const {command:action,...args}=pendingAction;adoptView(await invoke(action,args));pendingAction=null;render();
    started=view.ok&&action==='start';
    walkStory=storyEvent(action,args.request_id,view,language);
    reaction=walkStory?null:reactionEvent(action,args.request_id,view,language);
    let message=view.msg;
    if(view.xp_result){message+=` +${view.xp_result.gained} XP`;if(view.xp_result.evolutions?.length)message+=`\n${tr('evolved',{stage:view.status.stage_label})}`;}
    if(view.loot)message+=` · ${tr('loot',{food:view.loot.normal_feed||0,rare:view.loot.rare_feed||0})}`;
    text('#action-result',message);if(!view.ok)notice(view.msg);
    if(view.ok&&action==='battle'){storyDialog.battle();battleScene.show(view,before,portrait,language);}
    if(view.ok&&view.dungeon_discovered)text('#action-result',`${message} · ${tr('dungeonDiscovered',{name:tr('dungeon_'+view.dungeon_discovered)})}`);
    if(outing&&!(view.ok&&action==='battle'))storyDialog.result($('#action-result').textContent);
    if(view.ok&&view.dungeon_visit)dungeons.visit(view.dungeon_visit);
    else if(view.ok&&view.dungeon_run)dungeons.show(view.dungeon_run);
  }catch(error){notice(`${problem(error)} ${tr('uncertain')}`);text('#action-result',tr('unknownResult'));$('#retry-action').hidden=false;if(outing)storyDialog.result(`${problem(error)} ${tr('uncertain')}`);}
  finally{controls(false);}
  if(walkStory){storyDialog.begin();void stories.start(walkStory);}
  reactions.enqueue(reaction);
  if(started){
    await birth.started(view);
    const source=art[`${view?.pet_id}/birth-source`];
    if(view?.status&&(!source||['done','abandoned'].includes(source.phase))){await setupPersonality(true);await preparePixel();}
  }
}
async function saveMerged(key,merge){await assertActive();return mergeSaved(anna.storage,key,merge);}
async function chat(event){
  event.preventDefault();if(busy||pendingChat||pendingAction||pendingRemoval||!view?.status)return;
  const input=$('#chat-input'),message=input.value.trim();if(!message)return;
  controls(true);notice();const additions=[{id:crypto.randomUUID(),role:'user',text:message,at:Date.now()}];
  history=mergeHistory(history,additions);drawChat();input.value='';
  try{
    view=await assertActive();render();
    const response=await anna.llm.complete({messages:history.filter(m=>m.kind!=='reaction'||m.state==='done').slice(-12).map(m=>({role:m.role,content:{type:'text',text:m.text}})),systemPrompt:chatPrompt(language,view.status),maxTokens:280,temperature:.7,modelPreferences:{costPriority:1,speedPriority:.8}});
    if(typeof response.content?.text!=='string'||!response.content.text.trim())throw new Error('empty response');
    additions.push({id:crypto.randomUUID(),role:'assistant',text:response.content.text,at:Date.now()});history=mergeHistory(history,additions);drawChat();
    pendingChat=additions;await persistChat();
  }catch(error){if(error instanceof ErasedError){notice(tr('removedHeading'));forgetCachedData();}else{notice(tr('chatFailed',{error:problem(error)}));input.value=message;history=history.filter(m=>m.id!==additions[0].id);drawChat();}}
  finally{controls(false);input.focus();}
}
async function persistChat(){
  try{
    history=await saveMerged(CHAT,old=>mergeHistory(old,pendingChat));
    pendingChat=null;drawChat();notice(tr('chatSaved'));
  }catch(error){
    if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}
    else notice(tr('chatUnsaved'));
  }
}
async function retryChat(){
  if(busy||pendingAction||pendingRemoval||!pendingChat)return;
  controls(true);notice();try{await persistChat();}finally{controls(false);}
}
async function cleanupPortraits(){
  if(busy||pendingAction||pendingRemoval||pendingImage||birth?.hasOutput()||pixels?.hasPending())return;
  if(!$('#portraits-quiescent').checked){text('#portraits-error',tr('portraitsConfirm'));return;}
  $('#portraits-dialog').close();controls(true);notice();
  try{
    const result=await cleanUnusedPortraits(anna,assertActive);
    notice(tr('portraitsCleaned',result));
  }catch(error){
    if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}
    else notice(tr('portraitsFailed'));
  }finally{controls(false);}
}
async function uploadPortrait(path,blob){
  const upload=await anna.files.upload_init({path,content_type:blob.type||'image/png',size:blob.size});
  const result=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:blob});
  if(!result.ok)throw new Error('image upload');
  await anna.files.upload_finalize({path,size:blob.size});
}
async function generate(){
  if(busy)return;$('#draw-dialog').close();controls(true);notice();text('#draw',tr('drawing'));
  try{
    if(!pendingImage){
      const snapshot=await assertActive();
      const originalFeatures=art[`${snapshot.pet_id}/birth-source`]?.features;
      const generated=await anna.image.generate({prompt:typeof originalFeatures==='string'&&originalFeatures?artworkGrowthPrompt(snapshot,originalFeatures):`${snapshot.image_prompt}. One single friendly virtual pet, full body centered with generous margins, plain white background, soft painted game character illustration, smooth warm shading, delicate warm outlines, pastel colors. No text, lettering, notebook, desk, scenery, panels, photorealism or 3D rendering.`,n:1,size:'1024x1024',quality:'low',resolution:'1K',output_format:'png'},{timeoutMs:240000});
      const url=generated.images?.[0]?.url;if(!url)throw new Error('no image');
      pendingImage={key:imageKey(snapshot),url,path:`portraits/${snapshot.pet_id}/${crypto.randomUUID()}.png`};
    }
    await assertActive();
    const p=pendingImage;
    if(!p.blob){const response=await fetch(p.url);if(!response.ok)throw new Error('image download');p.blob=await response.blob();}
    if(!p.uploaded){const upload=await anna.files.upload_init({path:p.path,content_type:p.blob.type||'image/png',size:p.blob.size});const result=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:p.blob});if(!result.ok)throw new Error('image upload');await anna.files.upload_finalize({path:p.path,size:p.blob.size});p.uploaded=true;}
    const active=await assertActive();
    if(p.key!==imageKey(active)){pendingImage=null;throw new PartnerChangedError();}
    art=await saveMerged(ART,old=>({...old,[p.key]:{path:p.path,at:Date.now()}}));urls[p.key]=(await anna.files.download_url({path:p.path})).get_url;pendingImage=null;
    await pixels.sync(active,p.blob);await readExtras();render();notice(tr('imageSaved'));
  }catch(error){if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}else notice(pendingImage?tr('imagePending'):tr('imageFailed',{error:problem(error)}));}
  finally{text('#draw',tr(pendingImage?'retryImage':'draw'));controls(false);}
}
async function privacyCall(args){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'privacy',args},{timeoutMs:60000}));}
async function previewRemoval(){
  if(busy)return;$('#privacy-dialog').close();controls(true);notice();
  try{
    removalPreview=await privacyCall({action:'inspect'});
    if(removalPreview.erased){view={erased:true};render();notice(tr('cleanupPending'));return;}
    if(!removalPreview.ok||!removalPreview.exists||!removalPreview.etag){notice(tr('removalUnavailable'));return;}
    $('#erase-phrase').value='';$('#erase-quiescent').checked=false;$('#erase-dialog').showModal();
  }catch(error){notice(problem(error));}
  finally{controls(false);}
}
async function cleanupRemovedData(){
  try{
    await removeAppData(anna,()=>privacyCall({action:'inspect'}));
    try{preferences?.removeItem('notebuddy/language-v1');}catch{/* No personal content is stored in this preference. */}
    notice(tr('cleanupChecked'));
  }catch{notice(tr('cleanupPending'));}
}
async function confirmRemoval(){
  if(busy)return;
  if($('#erase-phrase').value!=='DELETE NOTEBUDDY'||!$('#erase-quiescent').checked){$('#erase-error').textContent=tr('eraseConfirmNeeded');return;}
  $('#erase-error').textContent='';$('#erase-dialog').close();pendingRemoval=true;controls(true);notice();
  try{
    const result=await privacyCall({action:'erase',confirmation:'DELETE NOTEBUDDY',expected_etag:removalPreview.etag});
    if(!result.ok||!result.erased){pendingRemoval=false;notice(tr('removalChanged'));return;}
    pendingRemoval=false;view={erased:true};render();await cleanupRemovedData();
  }catch{notice(tr('removalUncertain'));}
  finally{controls(false);}
}
async function resetCall(args){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'reset',args},{timeoutMs:60000}));}
async function previewReset(){
  if(busy)return;$('#privacy-dialog').close();controls(true);notice();
  try{
    resetPreview=await resetCall({action:'inspect'});
    if(resetPreview.reset_pending){view=resetPreview;render();return;}
    if(!resetPreview.ok||!resetPreview.exists||!resetPreview.etag){notice(tr('resetUnavailable'));return;}
    text('#reset-dialog [data-i18n=resetWarning]',tr(resetPreview.erased?'restartWarning':'resetWarning'));
    $('#reset-phrase').value='';$('#reset-quiescent').checked=false;text('#reset-error','');$('#reset-dialog').showModal();
  }catch(error){notice(problem(error));}finally{controls(false);}
}
async function resumeReset(){
  if(busy)return;controls(true);notice();
  try{
    if(pendingResetRequest){
      const result=await resetCall(pendingResetRequest);
      if(!result.ok){pendingResetRequest=null;view=await invoke('status');await readExtras();render();notice(tr('resetChanged'));return;}
      pendingResetRequest=null;
      if(result.reset_complete){view=await invoke('status');await readExtras();render();notice(tr('resetDone'));return;}
      view=result;render();
    }
    if(!view?.reset_pending)throw Error('Refresh before resuming reset');
    const check=await resetCall({action:'inspect'});
    if(check.erased)throw new ErasedError();
    if(!check.reset_pending&&check.reset_id===view.reset_id){view=await invoke('status');await readExtras();render();notice(tr('resetDone'));return;}
    await finishReset(anna,resetCall,view.reset_id);
    forgetCachedData();view=await invoke('status');await readExtras();render();notice(tr('resetDone'));
  }catch(error){
    if(error instanceof ErasedError){pendingResetRequest=null;view={erased:true};render();notice(tr('removedHeading'));}
    else{render();notice(tr('resetInterrupted'));}
  }finally{controls(false);}
}
$('#reset-game').addEventListener('click',previewReset);
$('#restart-removed').addEventListener('click',previewReset);
$('#resume-reset').addEventListener('click',resumeReset);
$('#confirm-reset').addEventListener('click',()=>{
  if($('#reset-phrase').value!=='RESET NOTEBUDDY'||!$('#reset-quiescent').checked){text('#reset-error',tr('resetConfirmNeeded'));return;}
  pendingResetRequest={action:'begin',confirmation:'RESET NOTEBUDDY',expected_etag:resetPreview.etag,reset_id:crypto.randomUUID()};
  $('#reset-dialog').close();render();resumeReset();
});
$('#erase-data').addEventListener('click',previewRemoval);
$('#confirm-erase').addEventListener('click',confirmRemoval);
$('#resume-cleanup').addEventListener('click',async()=>{if(busy)return;controls(true);try{await cleanupRemovedData();}finally{controls(false);}});
$('#language').addEventListener('change',async()=>{
  if(busy)return;language=$('#language').value;
  const saved=saveLanguage(preferences,language);translate();
  // Hide old localized labels until the read-only response uses the new language.
  $('#game').hidden=true;$('#welcome').hidden=true;text('#connection',tr('connecting'));
  await refresh();if(!saved)notice(tr('languageUnsaved'));
});
$('#privacy').addEventListener('click',()=>$('#privacy-dialog').showModal());
$('#refresh').addEventListener('click',refresh);
$('#prepare-pixel').addEventListener('click',preparePixel);
$('#start-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||pendingAction||pendingRemoval)return;
  const name=$('#pet-name').value.trim();$('#pet-name').value=name;if(!$('#start-form').reportValidity())return;
  if($('#birth-mode').value==='art'){
    controls(true);let accepted=false;try{accepted=await birth.prepare();}finally{controls(false);}
    if(!accepted)return;
  }else birth.clear();
  await act('start',{name,...birth.startTraits()});
});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));
$('#retry-action').addEventListener('click',()=>pendingAction&&act(pendingAction.command,{},true));
$('#chat-form').addEventListener('submit',chat);
$('#retry-chat').addEventListener('click',retryChat);
$('#clean-portraits').addEventListener('click',()=>{if(busy||pendingImage||pendingAction||pendingRemoval||birth?.hasOutput()||pixels?.hasPending())return;$('#portraits-quiescent').checked=false;text('#portraits-error','');$('#portraits-dialog').showModal();});
$('#confirm-clean-portraits').addEventListener('click',cleanupPortraits);
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('#chat-input').value=tr(button.dataset.prompt);$('#chat-input').focus();}));
$('#draw').addEventListener('click',()=>pendingImage?generate():$('#draw-dialog').showModal());$('#confirm-draw').addEventListener('click',generate);
let reactionNotice='';
function reactionFeedback(key=''){reactionNotice=key;const e=$('#reaction-status');e.hidden=!key;e.textContent=key?tr(key):'';}
reactions=createReactions({anna:()=>anna,active:assertActive,saved:saved=>{const local=history.filter(item=>item.kind!=='reaction'&&!saved.some(value=>value.id===item.id));history=mergeHistory(saved,[...local,...(pendingChat||[])]);},render:drawChat,feedback:reactionFeedback});
$('#retry-reaction').addEventListener('click',async()=>{if(busy||pendingAction||pendingRemoval||pendingResetRequest)return;controls(true);try{await reactions.retrySave();}finally{controls(false);}});
let birthNotice=null;
function birthMessage(key,values={}){birthNotice={key,values};for(const id of ['#birth-status','#birth-recovery-status']){text(id,tr(key,values));$(id).hidden=false;}notice(['artChecking','artUploading','artGenerating','artSaving'].includes(key)?'':tr(key,values));}
artEditor=createArtworkEditor({document,tr,locked:()=>busy||!!pendingAction||birth?.hasOutput()});
birth=createBirthFlow({
  anna:()=>anna,view:()=>view,art:()=>art,language:()=>language,editor:artEditor,
  locked:()=>busy||!!(pendingAction||pendingRemoval||pendingResetRequest||pendingImage),
  controls,assertActive,upload:uploadPortrait,isPartnerChanged:error=>error instanceof PartnerChangedError,
  save:async merge=>{art=await saveMerged(ART,merge);return art;},
  portraitSaved:async(snapshot,blob)=>{await setupPersonality(true);await pixels.sync(snapshot,blob);},
  reload:async()=>{await readExtras();render();},
  clearMessage:()=>{birthNotice=null;for(const id of ['#birth-status','#birth-recovery-status']){text(id,'');$(id).hidden=true;}},
  message:birthMessage,
  confirm:assessment=>new Promise(resolve=>{
    const dialog=$('#art-traits-dialog');
    text('#art-traits-summary',tr('artTraitsSummary',{species:tr('species_'+assessment.species),element:tr('element_'+assessment.element)}));
    dialog.returnValue='';dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
    dialog.addEventListener('close',()=>resolve(dialog.returnValue==='accept'),{once:true});dialog.showModal();
  }),
  panel:(visible,pending)=>{
    const panel=$('#birth-recovery');panel.hidden=!visible;panel.dataset.working=String(busy);
    panel.setAttribute('aria-busy',String(visible&&busy));
    text('#birth-heading',tr(busy?'artWaiting':'artFinish'));
    panel.querySelector('[data-i18n=artRecoveryHelp]').textContent=tr(busy?'artWaitingHelp':'artRecoveryHelp');
    panel.querySelector('[data-i18n=artRetryUsage]').hidden=busy;
    panel.querySelector('.birth-buttons').hidden=busy||!view?.status||!!pendingAction;
    $('#game').hidden=visible||!view?.status||!!(view?.reset_pending||pendingResetRequest);
    $('#welcome').hidden=visible||view?.code!=='not_started'||!!pendingResetRequest;
text('#retry-birth',tr(pending?'artRetrySave':'artRetry'));$('#replace-birth-source').disabled=busy||pending;if(visible)document.querySelectorAll('[data-action],#draw,#draw-evolved').forEach(e=>e.disabled=true);},
});
$('#birth-mode').addEventListener('change',()=>{$('#birth-art-choice').hidden=$('#birth-mode').value!=='art';});
$('#choose-art').addEventListener('click',()=>artEditor.open());
$('#setup-birth').addEventListener('click',()=>artEditor.open());
document.addEventListener('artwork-selected',()=>birth.selected());
$('#replace-birth-source').addEventListener('click',()=>artEditor.open());
$('#retry-birth').addEventListener('click',()=>birth.run());
$('#default-birth').addEventListener('click',()=>birth.fallback());
storyDialog=createStoryDialog({document,language:()=>language,view:()=>view,tr,locked:()=>busy||!!(pendingAction||pendingRemoval||pendingResetRequest),choose:index=>stories.choose(index),closeBattle:()=>battleScene.close(),busy:()=>busy,retryPending:()=>!!pendingAction&&['walk_begin','walk_collect','walk_leave','battle','flee'].includes(pendingAction.command),retry:()=>$('#retry-action').click(),act,openDungeon:id=>{$('#dungeon-list').querySelector(`[data-dungeon="${id}"]`)?.click();}});
stories=createWalkStories({anna:()=>anna,active:assertActive,language:()=>language,resolve:async(event,index)=>{
  const before=await assertActive();
  if(before.pet_id!==event.pet_id)throw new PartnerChangedError();
  const current=before.status?.journey;
  if(current?.choice_id!==event.id)throw Error('Story changed');
  if(current.state==='done'){adoptView(before);render();return before;}
  const action=newAction(before,index===0?'walk_collect':'walk_leave',{choice_id:event.id});
  const {command,...args}=action;const result=await invoke(command,args);
  if(!result.ok)throw Error(result.msg);
  adoptView(result);render();return result;
},locked:()=>busy||!!(pendingAction||pendingRemoval||pendingResetRequest),render:state=>storyDialog.render(state)});
pixels=createPixelPet({anna:()=>anna,art:()=>art,assertActive,upload:uploadPortrait,
  saved:value=>{art=value;},message:key=>{pixelNotice=key;renderPixel();}});
dungeons=createDungeons({document,view:()=>view,language:()=>language,
  locked:()=>busy||!!(pendingAction||pendingRemoval||pendingResetRequest),act,pixelUrl,
  portraitUrl:()=>view?urls[imageKey(view)]||starter(view):'icon.svg'});

function renderPersonality(){
 const p=view?.status?.personality,box=$('#personality-details');if(!box)return;
 $('#personality-heading').textContent=tr(personalityWorking?'personalityWorking':'personalityHeading');
 $('#personality-summary').textContent=p?.origin.summary[language]||tr('personalityIntro');
 $('#personality-voice').textContent=p?`${p.origin.voice[language]} · ${p.origin.habit[language]}`:'';
 $('#personality-traits').replaceChildren();
 if(p)for(const axis of personalityAxes){
  const value=p.values[axis],span=document.createElement('span');span.className='badge';
  span.textContent=tr(`trait_${axis}_${value<45?'low':value>55?'high':'mid'}`);$('#personality-traits').append(span);
 }
 const changes=Object.entries(p?.changes||{}).map(([axis,change])=>tr('personalityChange',{actions:change.actions.map(a=>tr('memory_'+a)).join(' · '),trait:tr('axis_'+axis),direction:tr(change.amount>0?'more':'less')}));
 $('#personality-growth').textContent=changes.join(' ')||tr(p?'personalityStable':'personalityUsage');
 $('#personality-status').textContent=personalityWorking?tr('personalityWorking'):personalityFeedback?tr(personalityFeedback):'';
 $('#meet-personality').hidden=!!p;$('#meet-personality').disabled=busy||personalityWorking||!!pendingAction||!!pendingRemoval||!!pendingResetRequest;
}
async function setupPersonality(automatic=false){
 if(!view?.status||busy&&!automatic||pendingAction||pendingRemoval||pendingResetRequest)return;
 const wasBusy=busy;controls(true);try{await persona.run(automatic);render();}finally{controls(wasBusy);renderPersonality();}
}
$('#meet-personality').onclick=()=>setupPersonality();
persona=createPersonality({anna:()=>anna,active:assertActive,
 render:state=>{personalityWorking=state.working;personalityFeedback=state.feedback;renderPersonality();},
 saved:next=>{adoptView(next);render();},
 features:async snapshot=>{
  const saved=(await anna.storage.get({key:ART})).value||{};
  const reference=saved[`${snapshot.pet_id}/birth-source`];
  if(reference?.phase==='done'&&reference.features)return {appearance:reference.features,source:'reference'};
  const portrait=saved[imageKey(snapshot)];
  if(portrait?.path){
   const url=(await anna.files.download_url({path:portrait.path})).get_url;
   const response=await fetch(url);if(!response.ok)throw Error('Portrait unavailable');
   const result=await checkArtwork(anna,await response.blob());return {appearance:result.features,source:'portrait'};
  }
  const response=await fetch('starter-features.json');if(!response.ok)throw Error('Starter observations unavailable');
  const sources=await response.json(),appearance=sources[`${snapshot.species_key}_${snapshot.element_key}_stage1.png`];
  if(!appearance)throw Error('Starter observations unavailable');return {appearance,source:'starter'};
 },
 commit:async(snapshot,profile)=>{const {command,...args}=newAction(snapshot,'personality',{profile});return invoke(command,args);}
});

translate();
await refresh();
