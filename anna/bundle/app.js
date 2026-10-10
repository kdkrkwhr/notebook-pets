import {createBattle} from './battle.mjs';
import {createReactions,reactionEvent} from './reactions.mjs';
let reactions;
import {createArtworkEditor} from './birth-art.mjs';
import {describePortrait,evolutionDescription} from './portrait-features.mjs';
import {createBirthFlow} from './birth-flow.mjs';
let birth,artEditor;
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
let anna,view=null,busy=false,history=[],art={},urls={},pendingAction=null,pendingImage=null,pendingChat=null;
let removalPreview=null,pendingRemoval=false,resetPreview=null,pendingResetRequest=null;
const tr=(key,values)=>t(language,key,values);
const problem=error=>errorText(error,language);
const battleScene=createBattle(document);
const feedback={};
function localStatus(area,key='',values={}){
  feedback[area]={key,values};
  const element=$(`#${area}-status`);element.textContent=key?tr(key,values):'';element.hidden=!key;
}
function report(area,key,values={}){localStatus(area,key,values);notice(tr(key,values));}
$('#draw-evolved').addEventListener('click',()=>$('#draw').click());

function notice(message=''){ $('#notice').textContent=message;$('#notice').hidden=!message; }
function controls(value){
  busy=value;
  document.querySelectorAll('button,input,select').forEach(e=>e.disabled=value);
  if(!value&&(!anna||pendingRemoval||pendingAction||pendingResetRequest||view?.reset_pending))document.querySelectorAll('[data-action],#start-form button,#chat-form button,#chat-input,#draw').forEach(e=>e.disabled=true);
  $('#guide-chat').disabled=value||!!(pendingChat||pendingAction||pendingRemoval||pendingResetRequest||view?.reset_pending)||!view?.status;
  $('#retry-care').hidden=!pendingAction||!view?.status;
  $('#retry-care').disabled=value||!!(pendingRemoval||pendingResetRequest||view?.reset_pending);
  $('#retry-chat').hidden=!pendingChat;
  $('#retry-reaction').hidden=!reactions?.hasUnsaved();
  if(!value&&pendingChat)document.querySelectorAll('#chat-form button,#chat-input').forEach(e=>e.disabled=true);
  if(!value&&(!anna||pendingRemoval||pendingAction||pendingImage||birth?.hasOutput()))$('#clean-portraits').disabled=true;
  if(!value&&(pendingRemoval||pendingAction))$('#retry-chat').disabled=true;
  if(!value&&anna&&!pendingRemoval&&!pendingAction&&!pendingResetRequest&&!view?.reset_pending&&view?.status)$('#claimquest').disabled=!view.status.quest?.ready;
  birth?.render();
}
function text(id,value){$(id).textContent=String(value??'');}
function picture(img,src,fallback){img.onerror=()=>{img.onerror=null;img.src=fallback;};img.src=src;}
function translate(){
  translateDocument(document,language);$('#language').value=language;
  for(const [area,{key,values}] of Object.entries(feedback)){localStatus(area,key,values);if(area==='birth')text('#birth-recovery-status',tr(key,values));}
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
  container.scrollTop=container.scrollHeight;
}
function previousPortrait(v){for(let stage=v.stage-1;stage>=1;stage--){const url=urls[imageKey(v,stage)];if(url)return url;}return starter(v);}
function evolutionEffect(phase=''){
  const frame=$('.portrait');if(phase)frame.classList.remove('evolution-reveal');frame.classList.toggle('evolving',!!phase);frame.setAttribute('aria-busy',String(!!phase));
  const effect=$('#evolution-effect');effect.hidden=!phase;text('#evolution-phase',phase?tr(phase):'');
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
  const resetting=!!(view?.reset_pending||pendingResetRequest);
  $('#resetting').hidden=!resetting;
  if(resetting)forgetCachedData();
  const s=resetting?null:view?.status;
  $('#removed').hidden=!view?.erased;
  $('#reset-game').hidden=resetting||!s;
  if(view?.erased)forgetCachedData();
  $('#welcome').hidden=resetting||!!s||view?.code!=='not_started';$('#game').hidden=!s;
  if(!s)return;
  text('#name',s.name);text('#pet-type',`${s.species} · ${s.element}`);text('#mood',`◌ ${s.mood}`);
  renderWalkEnergy();
  text('#title',s.title);text('#level',`Lv. ${s.level}`);text('#stage-label',s.stage_label);
  text('#xp-label',`${s.xp} / ${s.xp_next} XP`);$('#xp').max=s.xp_next;$('#xp').value=s.xp;
  for(const key of ['satiety','intimacy']){text(`#${key}`,`${s[key]} / 100`);$(`#${key}-bar`).value=s[key];}
  text('#stats',tr('stats',{...s.stats,...s.record,draw:s.record.draw||0}));
  text('#inventory',tr('inventory',{food:view.inventory.normal_feed,rare:view.inventory.rare_feed}));
  $('#setup-birth').hidden=view.stage!==1||!!art[`${view.pet_id}/birth-source`]||!!art[imageKey(view,1)];
  const image=urls[imageKey(view)];picture($('#pet-image'),image||previousPortrait(view),starter(view));
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
  drawChat();birth?.render();
}
function forgetCachedData(){
  reactions?.clear();localStatus('reaction');
  birth?.clear();
  battleScene.close();evolutionEffect();localStatus('chat');localStatus('image');
  history=[];art={};urls={};pendingAction=null;pendingImage=null;pendingChat=null;
  $('#messages').replaceChildren();$('#album').replaceChildren();$('#quests').replaceChildren();
  for(const id of ['name','pet-type','title','action-result','pet-name','chat-input','mood','level','stage-label','xp-label','satiety','intimacy','stats','inventory','image-caption','quest-date','encounter-text']){const e=$(`#${id}`);if('value' in e)e.value='';else e.textContent='';}
  for(const e of document.querySelectorAll('#game progress'))e.value=0;
  $('#encounter').hidden=true;
  $('#pet-image').onerror=null;$('#pet-image').src='icon.svg';$('#pet-image').alt='';
  $('#retry-action').hidden=true;$('#retry-care').hidden=true;$('#retry-chat').hidden=true;text('#draw',tr('draw'));
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

  const previousArt=art,previousUrls=urls;
  const results=await Promise.allSettled([anna.storage.get({key:CHAT}),anna.storage.get({key:ART})]);
  if(results[0].status==='fulfilled')history=mergeHistory(results[0].value.value,pendingChat||[]);
  if(results[1].status==='fulfilled')art=results[1].value.value||{};
  let incomplete=results.some(r=>r.status==='rejected');
  const nextUrls={};
  await Promise.all(Object.entries(art).filter(([key])=>key.startsWith(`${view?.pet_id}/`)&&!key.endsWith('/birth-source')).map(async([key,entry])=>{
    try{
      if(entry?.state==='generating')return;
      if(typeof entry?.path!=='string'||!entry.path)throw new Error('Invalid portrait reference');
      const url=(await anna.files.download_url({path:entry.path})).get_url;
      if(typeof url!=='string'||!url)throw new Error('Missing portrait URL');
      nextUrls[key]=url;
    }catch{
      incomplete=true;
      // Retain only the exact same saved file. Replaced or removed references
      // must never resurrect an older portrait after a failed URL request.
      if(entry?.path&&previousArt[key]?.path===entry.path&&previousUrls[key])nextUrls[key]=previousUrls[key];
    }
  }));
  urls=nextUrls;
  if(incomplete)notice(tr('extrasError'));
}
async function invoke(command,extra={}){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'game',args:{command,...extra,language}}, {timeoutMs:60000}));}
async function refresh(){
  if(busy)return;controls(true);notice();
  try{
    anna??=await AnnaAppRuntime.connect();
    const changed=adoptView(await invoke('status'));if(!view.ok&&view.code!=='not_started')notice(view.msg);
    if(view.erased||view.status||view.code==='not_started')pendingRemoval=false;await readExtras();render();text('#connection',tr('connected'));
    if(changed)notice(tr('partnerChanged'));
    if(pendingAction)notice(tr('uncertain'));
  }catch(error){notice(problem(error));text('#connection',tr('disconnected'));}
  finally{controls(false);}
  if(view?.status&&view.stage>1&&!pendingAction&&!pendingImage&&!pendingRemoval&&!pendingResetRequest)await generate(true);
}
async function act(command,extra={},retry=false){
  if(busy||pendingRemoval||(!retry&&pendingAction))return;controls(true);notice();
  if(!retry){try{pendingAction=newAction(view,command,extra);}catch{notice(tr('refreshAction'));controls(false);return;}}
  let evolved=false,started=false,reaction=null;
  $('#retry-action').hidden=true;text('#action-result',tr('working'));
  try{
    const before=view;const portrait=urls[imageKey(before)];
    const {command:action,...args}=pendingAction;adoptView(await invoke(action,args));pendingAction=null;render();
    evolved=!!(view.ok&&view.stage>1&&((before?.pet_id===view.pet_id&&view.stage>before.stage)||view.xp_result?.evolutions?.length));
    started=view.ok&&action==='start';
    reaction=reactionEvent(action,args.request_id,view,language);
    let message=view.msg;
    if(view.xp_result){message+=` +${view.xp_result.gained} XP`;if(view.xp_result.evolutions?.length)message+=`\n${tr('evolved',{stage:view.status.stage_label})}`;}
    if(view.loot)message+=` · ${tr('loot',{food:view.loot.normal_feed||0,rare:view.loot.rare_feed||0})}`;
    text('#action-result',message);if(!view.ok)notice(view.msg);
    if(view.ok&&action==='battle')battleScene.show(view,before,portrait,language);
  }catch(error){notice(`${problem(error)} ${tr('uncertain')}`);text('#action-result',`${problem(error)} ${tr('uncertain')}`);$('#retry-action').hidden=false;}
  finally{controls(false);}
  reactions.enqueue(reaction);
  if(started)await birth.started(view);
  if(evolved){
    if($('#battle-dialog').open)$('#battle-dialog').addEventListener('close',()=>generate(true),{once:true});
    else await generate(true);
  }
}
async function saveMerged(key,merge){await assertActive();return mergeSaved(anna.storage,key,merge);}
async function chat(event){
  event.preventDefault();if(busy||pendingChat||pendingAction||pendingRemoval||!view?.status)return;
  const input=$('#chat-input'),message=input.value.trim();if(!message)return;
  controls(true);notice();localStatus('chat','chatWorking');const additions=[{id:crypto.randomUUID(),role:'user',text:message,at:Date.now()}];
  history=mergeHistory(history,additions);drawChat();input.value='';
  try{
    view=await assertActive();render();
    const response=await anna.llm.complete({messages:history.filter(m=>m.kind!=='reaction'||m.state==='done').slice(-12).map(m=>({role:m.role,content:{type:'text',text:m.text}})),systemPrompt:chatPrompt(language,view.status),maxTokens:280,temperature:.7,modelPreferences:{costPriority:1,speedPriority:.8}});
    if(typeof response.content?.text!=='string'||!response.content.text.trim())throw new Error('empty response');
    additions.push({id:crypto.randomUUID(),role:'assistant',text:response.content.text,at:Date.now()});history=mergeHistory(history,additions);drawChat();
    pendingChat=additions;await persistChat();
  }catch(error){if(error instanceof ErasedError){notice(tr('removedHeading'));forgetCachedData();}else if(error instanceof PartnerChangedError){notice(tr('partnerChanged'));}else{report('chat','chatFailed',{error:problem(error)});input.value=message;history=history.filter(m=>m.id!==additions[0].id);drawChat();}}
  finally{controls(false);input.focus();}
}
async function persistChat(){
  localStatus('chat','chatSaving');
  try{
    history=await saveMerged(CHAT,old=>mergeHistory(old,pendingChat));
    pendingChat=null;drawChat();report('chat','chatSaved');
  }catch(error){
    if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}
    else report('chat',error instanceof PartnerChangedError?'partnerChanged':'chatUnsaved');
  }
}
async function retryChat(){
  if(busy||pendingAction||pendingRemoval||!pendingChat)return;
  controls(true);notice();try{await persistChat();}finally{controls(false);}
}
async function cleanupPortraits(){
  if(busy||pendingAction||pendingRemoval||pendingImage||birth?.hasOutput())return;
  if(!$('#portraits-quiescent').checked){text('#portraits-error',tr('portraitsConfirm'));return;}
  $('#portraits-dialog').close();controls(true);notice();
  try{
    const result=await cleanUnusedPortraits(anna,assertActive);
    notice(tr('portraitsCleaned',result));
  }catch(error){
    if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}
    else notice(tr(error instanceof PartnerChangedError?'partnerChanged':'portraitsFailed'));
  }finally{controls(false);}
}
class PortraitAlreadyStarted extends Error {}
async function uploadPortrait(path,blob){
  const upload=await anna.files.upload_init({path,content_type:blob.type||'image/png',size:blob.size});
  const result=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:blob});
  if(!result.ok)throw new Error('image upload');
  await anna.files.upload_finalize({path,size:blob.size});
}
async function referencePortrait(snapshot){
  // A fresh index and fresh signed URL: never silently substitute a different
  // character when a saved reference cannot be read.
  const saved=await anna.storage.get({key:ART});
  if(saved.value?._notebuddy_erased)throw new ErasedError();
  art=saved.value||{};
  for(let stage=snapshot.stage-1;stage>=1;stage--){
    const entry=art[imageKey(snapshot,stage)];
    if(entry?.state==='generating')continue; // Use the latest actually saved appearance, never an unfinished job.
    if(entry){
      if(!entry.path)throw new Error('Missing reference path');
      const {get_url}=await anna.files.download_url({path:entry.path});
      if(!get_url)throw new Error('Missing reference URL');
      return {url:get_url,stage,key:imageKey(snapshot,stage),entry};
    }
  }
  // Only the 72 baby pictures ship with the app. Upload the actual baby picture
  // so analysis can read it independently of the private app iframe session.
  const response=await fetch(starter(snapshot));if(!response.ok)throw new Error('Starter unavailable');
  const path=`portraits/${snapshot.pet_id}/starter.png`;
  await uploadPortrait(path,await response.blob());
  const key=imageKey(snapshot,1);
  art=await saveMerged(ART,old=>({...old,[key]:old?.[key]||{path,at:Date.now(),starter:true}}));
  const {get_url}=await anna.files.download_url({path:art[key].path});
  if(!get_url)throw new Error('Missing reference URL');
  return {url:get_url,stage:1,key,entry:art[key]};
}
async function generate(automatic=false){
  if(busy||pendingAction||pendingRemoval||pendingResetRequest)return;
  // Event listeners call this through a wrapper, never pass an Event as a flag.
  $('#draw-dialog').close();controls(true);
  let snapshot,animation=false,savedEarlierStage=false;
  try{
    snapshot=await assertActive();
    if(automatic){
      if(snapshot.stage<2||pendingImage)return;
      const saved=await anna.storage.get({key:ART});
      if(saved.value?._notebuddy_erased)throw new ErasedError();
      if(saved.value?.[imageKey(snapshot)])return; // Saved or uncertain: no automatic paid retry.
    }
    notice();text('#draw',tr('drawing'));localStatus('image',pendingImage?'imageSaving':'drawing');
    animation=snapshot.stage>1;
    if(animation)evolutionEffect('evolutionWorking');
    if(!pendingImage){
      let reference;
      if(snapshot.stage>1)reference=await referencePortrait(snapshot);
      const key=imageKey(snapshot),path=`portraits/${snapshot.pet_id}/${crypto.randomUUID()}.png`;
      if(automatic){
        // Reference preparation establishes the album row. Conditional writes
        // then serialize automatic attempts on that existing row.
        art=await saveMerged(ART,old=>{
          if(old?.[key])throw new PortraitAlreadyStarted();
          return {...old,[key]:{path,state:'generating',at:Date.now()}};
        });
      }
      let features,identity='';
      if(reference){
        features=reference.entry.features;
        if(typeof features!=='string'||!features.trim()||features.length>600){
          localStatus('image','analyzingPortrait');
          features=await describePortrait(anna,reference.url);
          await assertActive();
          art=await saveMerged(ART,old=>{
            if(old?.[reference.key]?.path!==reference.entry.path)throw new PartnerChangedError();
            return {...old,[reference.key]:{...old[reference.key],features}};
          });
        }
        identity=typeof reference.entry.identity==='string'&&reference.entry.identity.trim()&&reference.entry.identity.length<=600?reference.entry.identity:features;
      }
      const prompt=reference?evolutionDescription(snapshot,reference.stage,identity,features):snapshot.image_prompt;
      await assertActive();
      const generated=await anna.image.generate({prompt:`${prompt}. One single friendly virtual pet, full body centered with generous margins, plain white background, soft painted game character illustration, smooth warm shading, delicate warm outlines, pastel colors. No text, lettering, notebook, desk, scenery, panels, photorealism or 3D rendering.`,n:1,size:'1024x1024',quality:'low',resolution:'1K',output_format:'png'},{timeoutMs:240000});
      const url=generated.images?.[0]?.url;if(!url)throw new Error('no image');
      pendingImage={key,url,path,identity};
    }
    localStatus('image','imageSaving');if(animation)evolutionEffect('evolutionSaving');
    await assertActive();
    const p=pendingImage;
    if(!p.blob){const response=await fetch(p.url);if(!response.ok)throw new Error('image download');p.blob=await response.blob();}
    if(!p.uploaded){await uploadPortrait(p.path,p.blob);p.uploaded=true;}
    art=await saveMerged(ART,old=>({...old,[p.key]:{path:p.path,at:Date.now(),...(p.identity?{identity:p.identity}:{})}}));
    const {get_url}=await anna.files.download_url({path:p.path});if(!get_url)throw new Error('Missing portrait URL');
    urls[p.key]=get_url;savedEarlierStage=p.key!==imageKey(snapshot);pendingImage=null;render();report('image','imageSaved');
    if(animation){$('.portrait').classList.remove('evolution-reveal');void $('.portrait').offsetWidth;$('.portrait').classList.add('evolution-reveal');}
  }catch(error){
    if(error instanceof PortraitAlreadyStarted){await readExtras();render();}
    else if(error instanceof ErasedError){view={erased:true};render();notice(tr('removedHeading'));}
    else report('image',error instanceof PartnerChangedError?'partnerChanged':pendingImage?'imagePending':snapshot?.stage>1?'evolutionFailed':'imageFailed',{error:problem(error)});
  }finally{evolutionEffect();text('#draw',tr(pendingImage?'retryImage':'draw'));controls(false);}
  if(savedEarlierStage)await generate(true);
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
    $('#reset-name').value='';$('#reset-phrase').value='';$('#reset-quiescent').checked=false;text('#reset-error','');$('#reset-dialog').showModal();
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
  const name=$('#reset-name').value.trim();
  if(!name||name.length>24||$('#reset-phrase').value!=='RESET NOTEBUDDY'||!$('#reset-quiescent').checked){text('#reset-error',tr('resetConfirmNeeded'));return;}
  pendingResetRequest={action:'begin',confirmation:'RESET NOTEBUDDY',expected_etag:resetPreview.etag,reset_id:crypto.randomUUID(),name};
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
function guideTarget(selector){
  const target=$(selector);target.scrollIntoView({block:'center'});target.focus({preventScroll:true});
}
$('#guide-care').addEventListener('click',()=>{if(!busy)guideTarget('[data-action="feed"]');});
$('#guide-chat').addEventListener('click',()=>{
  if(busy||pendingChat||pendingAction||pendingRemoval||pendingResetRequest||view?.reset_pending||!view?.status)return;
  const input=$('#chat-input');if(!input.value.trim())input.value=tr('guideHello');guideTarget('#chat-input');
});
$('#guide-album').addEventListener('click',()=>{if(!busy)guideTarget('.album-card');});
$('#privacy').addEventListener('click',()=>$('#privacy-dialog').showModal());
$('#refresh').addEventListener('click',refresh);
$('#start-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||pendingAction||pendingRemoval)return;
  const name=$('#pet-name').value.trim();$('#pet-name').value=name;if(!$('#start-form').reportValidity())return;
  if($('#birth-mode').value==='art'){
    controls(true);let accepted=false;try{accepted=await birth.prepare();}finally{controls(false);}
    if(!accepted)return;
  }else birth.clear();
  await act('start',{name});
});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));
for(const selector of ['#retry-action','#retry-care'])$(selector).addEventListener('click',()=>pendingAction&&act(pendingAction.command,{},true));
$('#chat-form').addEventListener('submit',chat);
$('#retry-chat').addEventListener('click',retryChat);
$('#clean-portraits').addEventListener('click',()=>{if(busy||pendingImage||pendingAction||pendingRemoval||birth?.hasOutput())return;$('#portraits-quiescent').checked=false;text('#portraits-error','');$('#portraits-dialog').showModal();});
$('#confirm-clean-portraits').addEventListener('click',cleanupPortraits);
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('#chat-input').value=tr(button.dataset.prompt);$('#chat-input').focus();}));
$('#draw').addEventListener('click',()=>pendingImage?generate():$('#draw-dialog').showModal());$('#confirm-draw').addEventListener('click',()=>generate());
reactions=createReactions({anna:()=>anna,active:assertActive,saved:saved=>{const local=history.filter(item=>item.kind!=='reaction'&&!saved.some(value=>value.id===item.id));history=mergeHistory(saved,[...local,...(pendingChat||[])]);},render:drawChat,feedback:key=>localStatus('reaction',key)});
$('#retry-reaction').addEventListener('click',async()=>{if(busy||pendingAction||pendingRemoval)return;controls(true);try{await reactions.retrySave();}finally{controls(false);}});
artEditor=createArtworkEditor({document,tr,locked:()=>busy||!!pendingAction||birth?.hasOutput()});
birth=createBirthFlow({
  anna:()=>anna,view:()=>view,art:()=>art,language:()=>language,editor:artEditor,
  locked:()=>busy||!!(pendingAction||pendingRemoval||pendingResetRequest||pendingImage),
  controls,assertActive,upload:uploadPortrait,isPartnerChanged:error=>error instanceof PartnerChangedError,
  save:async merge=>{art=await saveMerged(ART,merge);return art;},
  reload:async()=>{await readExtras();render();},
  clearMessage:()=>{delete feedback.birth;for(const id of ['#birth-status','#birth-recovery-status']){text(id,'');$(id).hidden=true;}},
  message:(key,values)=>{feedback.birth={key,values};for(const id of ['#birth-status','#birth-recovery-status']){text(id,tr(key,values));$(id).hidden=false;}notice(tr(key,values));},
  panel:(visible,pending)=>{$('#birth-recovery').hidden=!visible;text('#retry-birth',tr(pending?'artRetrySave':'artRetry'));$('#replace-birth-source').disabled=busy||pending;if(visible)document.querySelectorAll('[data-action],#draw,#draw-evolved').forEach(e=>e.disabled=true);},
});
$('#birth-mode').addEventListener('change',()=>{$('#birth-art-choice').hidden=$('#birth-mode').value!=='art';});
$('#choose-art').addEventListener('click',()=>artEditor.open());
$('#setup-birth').addEventListener('click',()=>artEditor.open());
document.addEventListener('artwork-selected',()=>birth.selected());
$('#replace-birth-source').addEventListener('click',()=>artEditor.open());
$('#retry-birth').addEventListener('click',()=>birth.run());
$('#default-birth').addEventListener('click',()=>birth.fallback());
translate();
await refresh();
