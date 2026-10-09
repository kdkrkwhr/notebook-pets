import { AnnaAppRuntime } from '/static/anna-apps/_sdk/latest/index.js';
import {unwrap,starter,imageKey,mergeHistory,errorText,newAction} from './model.mjs';
import {t,loadLanguage,saveLanguage,translateDocument,chatPrompt} from './i18n.mjs';

import {cleanUnusedPortraits} from './portraits.mjs';

const $=selector=>document.querySelector(selector);
const TOOL=window.__ANNA_TOOL_IDS__?.notebuddy||'tool-dev-notebuddy';
import {CHAT,ART,ErasedError,mergeSaved,removeAppData} from './data.mjs';
// Accessing localStorage itself can throw in a restricted iframe.
let preferences;
try{preferences=window.localStorage;}catch{preferences=null;}
let language=loadLanguage(preferences);
let anna,view=null,busy=false,history=[],art={},urls={},pendingAction=null,pendingImage=null,pendingChat=null;
let removalPreview=null,pendingRemoval=false;
const tr=(key,values)=>t(language,key,values);
const problem=error=>errorText(error,language);
function notice(message=''){ $('#notice').textContent=message;$('#notice').hidden=!message; }
function controls(value){
  busy=value;
  document.querySelectorAll('button,input,select').forEach(e=>e.disabled=value);
  if(!value&&(!anna||pendingRemoval||pendingAction))document.querySelectorAll('[data-action],#start-form button,#chat-form button,#chat-input,#draw').forEach(e=>e.disabled=true);
  $('#retry-chat').hidden=!pendingChat;
  if(!value&&pendingChat)document.querySelectorAll('#chat-form button,#chat-input').forEach(e=>e.disabled=true);
  if(!value&&(!anna||pendingRemoval||pendingAction||pendingImage))$('#clean-portraits').disabled=true;
  if(!value&&(pendingRemoval||pendingAction))$('#retry-chat').disabled=true;
  if(!value&&anna&&!pendingRemoval&&!pendingAction&&view?.status)$('#claimquest').disabled=!view.status.quest?.ready;
}
function text(id,value){$(id).textContent=String(value??'');}
function picture(img,src,fallback){img.onerror=()=>{img.onerror=null;img.src=fallback;};img.src=src;}
function translate(){
  translateDocument(document,language);$('#language').value=language;
  text('#draw',tr(pendingImage?'retryImage':'draw'));
}
function drawChat(){
  const container=$('#messages');container.replaceChildren();
  if(!history.length){const p=document.createElement('p');p.className='message';p.textContent=tr('chatEmpty');container.append(p);}
  for(const item of history){
    const p=document.createElement('div');p.className=`message ${item.role}`;
    const label=document.createElement('div');label.className='message-label';
    label.textContent=item.role==='user'?tr('you'):view?.status?.name||tr('friend');
    p.append(label,document.createTextNode(item.text));container.append(p);
  }
  container.scrollTop=container.scrollHeight;
}
function render(){
  const s=view?.status;
  $('#removed').hidden=!view?.erased;
  if(view?.erased)forgetCachedData();
  $('#welcome').hidden=!!s||view?.code!=='not_started';$('#game').hidden=!s;
  if(!s)return;
  text('#name',s.name);text('#pet-type',`${s.species} · ${s.element}`);text('#mood',`◌ ${s.mood}`);
  text('#title',s.title);text('#level',`Lv. ${s.level}`);text('#stage-label',s.stage_label);
  text('#xp-label',`${s.xp} / ${s.xp_next} XP`);$('#xp').max=s.xp_next;$('#xp').value=s.xp;
  for(const key of ['satiety','intimacy']){text(`#${key}`,`${s[key]} / 100`);$(`#${key}-bar`).value=s[key];}
  text('#stats',tr('stats',{...s.stats,...s.record,draw:s.record.draw||0}));
  text('#inventory',tr('inventory',{food:view.inventory.normal_feed,rare:view.inventory.rare_feed}));
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
  $('#album').replaceChildren();
  for(const entry of view.album.entries){
    const item=document.createElement('div');item.className='album-item';
    const frame=document.createElement('div');frame.className='album-image';
    if(entry.reached){const img=document.createElement('img');img.alt=entry.label;picture(img,urls[imageKey(view,entry.stage)]||starter(view),starter(view));frame.append(img);}else frame.textContent='?';
    const title=document.createElement('div');title.textContent=entry.label;
    const subtitle=document.createElement('small');subtitle.textContent=entry.reached?tr(entry.current?'currentStage':'memoryStage'):tr('futureStage',{level:entry.min_level});
    item.append(frame,title,subtitle);$('#album').append(item);
  }
  drawChat();
}
function forgetCachedData(){
  history=[];art={};urls={};pendingAction=null;pendingImage=null;pendingChat=null;
  $('#messages').replaceChildren();$('#album').replaceChildren();$('#quests').replaceChildren();
  for(const id of ['name','pet-type','title','action-result','pet-name','chat-input','mood','level','stage-label','xp-label','satiety','intimacy','stats','inventory','image-caption','quest-date','encounter-text']){const e=$(`#${id}`);if('value' in e)e.value='';else e.textContent='';}
  for(const e of document.querySelectorAll('#game progress'))e.value=0;
  $('#encounter').hidden=true;
  $('#pet-image').onerror=null;$('#pet-image').src='icon.svg';$('#pet-image').alt='';
  $('#retry-action').hidden=true;$('#retry-chat').hidden=true;
}
async function assertActive(){const status=await invoke('status');if(status.erased){view=status;render();throw new ErasedError();}if(!status.status)throw new Error('No active game');return status;}
async function readExtras(){
  if(view?.erased){forgetCachedData();return;}

  const results=await Promise.allSettled([anna.storage.get({key:CHAT}),anna.storage.get({key:ART})]);
  if(results[0].status==='fulfilled')history=mergeHistory(results[0].value.value,pendingChat||[]);
  if(results[1].status==='fulfilled')art=results[1].value.value||{};
  if(results.some(r=>r.status==='rejected'))notice(tr('extrasError'));
  urls={};await Promise.all(Object.entries(art).filter(([key])=>key.startsWith(`${view?.pet_id}/`)).map(async([key,entry])=>{try{urls[key]=(await anna.files.download_url({path:entry.path})).get_url;}catch{/* Keep the bundled portrait visible. */}}));
}
async function invoke(command,extra={}){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'game',args:{command,...extra,language}}, {timeoutMs:60000}));}
async function refresh(){
  if(busy)return;controls(true);notice();
  try{
    anna??=await AnnaAppRuntime.connect();
    view=await invoke('status');if(!view.ok&&view.code!=='not_started')notice(view.msg);
    if(view.erased||view.status||view.code==='not_started')pendingRemoval=false;await readExtras();render();text('#connection',tr('connected'));
    if(pendingAction)notice(tr('uncertain'));
  }catch(error){notice(problem(error));text('#connection',tr('disconnected'));}
  finally{controls(false);}
}
async function act(command,extra={},retry=false){
  if(busy||pendingRemoval||(!retry&&pendingAction))return;controls(true);notice();
  if(!retry){try{pendingAction=newAction(view,command,extra);}catch{notice(tr('refreshAction'));controls(false);return;}}
  $('#retry-action').hidden=true;text('#action-result',tr('working'));
  try{
    const {command:action,...args}=pendingAction;view=await invoke(action,args);pendingAction=null;render();
    let message=view.msg;
    if(view.xp_result){message+=` +${view.xp_result.gained} XP`;if(view.xp_result.evolutions?.length)message+=`\n${tr('evolved',{stage:view.status.stage_label})}`;}
    if(view.loot)message+=` · ${tr('loot',{food:view.loot.normal_feed||0,rare:view.loot.rare_feed||0})}`;
    text('#action-result',message);if(!view.ok)notice(view.msg);
  }catch(error){notice(`${problem(error)} ${tr('uncertain')}`);text('#action-result',tr('unknownResult'));$('#retry-action').hidden=false;}
  finally{controls(false);}
}
async function saveMerged(key,merge){await assertActive();return mergeSaved(anna.storage,key,merge);}
async function chat(event){
  event.preventDefault();if(busy||pendingChat||pendingAction||pendingRemoval||!view?.status)return;
  const input=$('#chat-input'),message=input.value.trim();if(!message)return;
  controls(true);notice();const additions=[{id:crypto.randomUUID(),role:'user',text:message,at:Date.now()}];
  history=mergeHistory(history,additions);drawChat();input.value='';
  try{
    view=await assertActive();render();
    const response=await anna.llm.complete({messages:history.slice(-12).map(m=>({role:m.role,content:{type:'text',text:m.text}})),systemPrompt:chatPrompt(language,view.status),maxTokens:280,temperature:.7,modelPreferences:{costPriority:1,speedPriority:.8}});
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
  if(busy||pendingAction||pendingRemoval||pendingImage)return;
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
async function generate(){
  if(busy)return;$('#draw-dialog').close();controls(true);notice();text('#draw',tr('drawing'));
  try{
    if(!pendingImage){
      const snapshot=await assertActive();
      const generated=await anna.image.generate({prompt:`${snapshot.image_prompt}. One single friendly virtual pet on a warm ivory notebook page, full body, delicate colored pencil and watercolor accents, no words, no lettering.`,n:1,size:'1024x1024',quality:'low',resolution:'1K',output_format:'png'},{timeoutMs:240000});
      const url=generated.images?.[0]?.url;if(!url)throw new Error('no image');
      pendingImage={key:imageKey(snapshot),url,path:`portraits/${snapshot.pet_id}/${crypto.randomUUID()}.png`};
    }
    await assertActive();
    const p=pendingImage;
    if(!p.blob){const response=await fetch(p.url);if(!response.ok)throw new Error('image download');p.blob=await response.blob();}
    if(!p.uploaded){const upload=await anna.files.upload_init({path:p.path,content_type:p.blob.type||'image/png',size:p.blob.size});const result=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:p.blob});if(!result.ok)throw new Error('image upload');await anna.files.upload_finalize({path:p.path,size:p.blob.size});p.uploaded=true;}
    art=await saveMerged(ART,old=>({...old,[p.key]:{path:p.path,at:Date.now()}}));urls[p.key]=(await anna.files.download_url({path:p.path})).get_url;pendingImage=null;render();notice(tr('imageSaved'));
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
$('#start-form').addEventListener('submit',e=>{e.preventDefault();act('start',{name:$('#pet-name').value.trim()});});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));
$('#retry-action').addEventListener('click',()=>pendingAction&&act(pendingAction.command,{},true));
$('#chat-form').addEventListener('submit',chat);
$('#retry-chat').addEventListener('click',retryChat);
$('#clean-portraits').addEventListener('click',()=>{if(busy||pendingImage||pendingAction||pendingRemoval)return;$('#portraits-quiescent').checked=false;text('#portraits-error','');$('#portraits-dialog').showModal();});
$('#confirm-clean-portraits').addEventListener('click',cleanupPortraits);
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('#chat-input').value=tr(button.dataset.prompt);$('#chat-input').focus();}));
$('#draw').addEventListener('click',()=>pendingImage?generate():$('#draw-dialog').showModal());$('#confirm-draw').addEventListener('click',generate);
translate();
await refresh();
