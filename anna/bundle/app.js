import { AnnaAppRuntime } from '/static/anna-apps/_sdk/latest/index.js';
import {unwrap,starter,imageKey,normalHistory,mergeHistory,errorText,newAction} from './model.mjs';
import {t,loadLanguage,saveLanguage,translateDocument,chatPrompt} from './i18n.mjs';

const $=selector=>document.querySelector(selector);
const TOOL=window.__ANNA_TOOL_IDS__?.notebuddy||'tool-dev-notebuddy';
const CHAT='notebuddy/chat-v1', ART='notebuddy/art-v1';
// Accessing localStorage itself can throw in a restricted iframe.
let preferences;
try{preferences=window.localStorage;}catch{preferences=null;}
let language=loadLanguage(preferences);
let anna,view=null,busy=false,history=[],art={},urls={},pendingAction=null,pendingImage=null;
const tr=(key,values)=>t(language,key,values);
const problem=error=>errorText(error,language);
function notice(message=''){ $('#notice').textContent=message;$('#notice').hidden=!message; }
function controls(value){
  busy=value;
  document.querySelectorAll('button,input,select').forEach(e=>e.disabled=value);
  if(!value&&view?.status)$('#claimquest').disabled=!view.status.quest?.ready;
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
async function readExtras(){
  const results=await Promise.allSettled([anna.storage.get({key:CHAT}),anna.storage.get({key:ART})]);
  if(results[0].status==='fulfilled')history=normalHistory(results[0].value.value);
  if(results[1].status==='fulfilled')art=results[1].value.value||{};
  if(results.some(r=>r.status==='rejected'))notice(tr('extrasError'));
  urls={};await Promise.all(Object.entries(art).filter(([key])=>key.startsWith(`${view?.pet_id}/`)).map(async([key,entry])=>{try{urls[key]=(await anna.files.download_url({path:entry.path})).get_url;}catch{/* Keep the bundled portrait visible. */}}));
}
async function invoke(command,extra={}){return unwrap(await anna.tools.invoke({tool_id:TOOL,method:'game',args:{command,...extra,language}}, {timeoutMs:60000}));}
async function refresh(){
  if(busy)return;controls(true);notice();
  try{
    view=await invoke('status');if(!view.ok&&view.code!=='not_started')notice(view.msg);
    await readExtras();render();text('#connection',tr('connected'));
    if(pendingAction)notice(tr('uncertain'));
  }catch(error){notice(problem(error));text('#connection',tr('disconnected'));}
  finally{controls(false);}
}
async function act(command,extra={},retry=false){
  if(busy)return;controls(true);notice();
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
async function saveMerged(key,merge){for(let attempt=0;attempt<3;attempt++){const current=await anna.storage.get({key});try{const value=merge(current.value);await anna.storage.set({key,value,...(current.etag?{if_match:current.etag}:{})});return value;}catch(error){if(!/precondition|conflict/i.test(String(error.message))||attempt===2)throw error;}}}
async function chat(event){
  event.preventDefault();if(busy||!view?.status)return;
  const input=$('#chat-input'),message=input.value.trim();if(!message)return;
  controls(true);notice();const additions=[{id:crypto.randomUUID(),role:'user',text:message,at:Date.now()}];
  history=mergeHistory(history,additions);drawChat();input.value='';
  try{
    view=await invoke('status');if(!view.ok||!view.status)throw new Error('status unavailable');render();
    const response=await anna.llm.complete({messages:history.slice(-12).map(m=>({role:m.role,content:{type:'text',text:m.text}})),systemPrompt:chatPrompt(language,view.status),maxTokens:280,temperature:.7,modelPreferences:{costPriority:1,speedPriority:.8}});
    if(typeof response.content?.text!=='string'||!response.content.text.trim())throw new Error('empty response');
    additions.push({id:crypto.randomUUID(),role:'assistant',text:response.content.text,at:Date.now()});history=mergeHistory(history,additions);drawChat();
    try{history=await saveMerged(CHAT,old=>mergeHistory(old,additions));}catch{notice(tr('chatUnsaved'));}
  }catch(error){notice(tr('chatFailed',{error:problem(error)}));input.value=message;history=history.filter(m=>m.id!==additions[0].id);drawChat();}
  finally{controls(false);input.focus();}
}
async function generate(){
  if(busy)return;$('#draw-dialog').close();controls(true);notice();text('#draw',tr('drawing'));
  try{
    if(!pendingImage){
      const snapshot=await invoke('status');if(!snapshot.status)throw new Error('no pet');
      const generated=await anna.image.generate({prompt:`${snapshot.image_prompt}. One single friendly virtual pet on a warm ivory notebook page, full body, delicate colored pencil and watercolor accents, no words, no lettering.`,n:1,size:'1024x1024',quality:'low',resolution:'1K',output_format:'png'},{timeoutMs:240000});
      const url=generated.images?.[0]?.url;if(!url)throw new Error('no image');
      pendingImage={key:imageKey(snapshot),url,path:`portraits/${snapshot.pet_id}/${crypto.randomUUID()}.png`};
    }
    const p=pendingImage;
    if(!p.blob){const response=await fetch(p.url);if(!response.ok)throw new Error('image download');p.blob=await response.blob();}
    if(!p.uploaded){const upload=await anna.files.upload_init({path:p.path,content_type:p.blob.type||'image/png',size:p.blob.size});const result=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:p.blob});if(!result.ok)throw new Error('image upload');await anna.files.upload_finalize({path:p.path,size:p.blob.size});p.uploaded=true;}
    art=await saveMerged(ART,old=>({...old,[p.key]:{path:p.path,at:Date.now()}}));urls[p.key]=(await anna.files.download_url({path:p.path})).get_url;pendingImage=null;render();notice(tr('imageSaved'));
  }catch(error){notice(pendingImage?tr('imagePending'):tr('imageFailed',{error:problem(error)}));}
  finally{text('#draw',tr(pendingImage?'retryImage':'draw'));controls(false);}
}
$('#language').addEventListener('change',async()=>{
  if(busy)return;language=$('#language').value;
  const saved=saveLanguage(preferences,language);translate();
  // Hide old localized labels until the read-only response uses the new language.
  $('#game').hidden=true;$('#welcome').hidden=true;text('#connection',tr('connecting'));
  await refresh();if(!saved)notice(tr('languageUnsaved'));
});
$('#refresh').addEventListener('click',refresh);
$('#start-form').addEventListener('submit',e=>{e.preventDefault();act('start',{name:$('#pet-name').value.trim()});});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.action)));
$('#retry-action').addEventListener('click',()=>pendingAction&&act(pendingAction.command,{},true));
$('#chat-form').addEventListener('submit',chat);
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('#chat-input').value=tr(button.dataset.prompt);$('#chat-input').focus();}));
$('#draw').addEventListener('click',()=>pendingImage?generate():$('#draw-dialog').showModal());$('#confirm-draw').addEventListener('click',generate);
translate();
try{anna=await AnnaAppRuntime.connect();await refresh();}
catch(error){notice(tr('openAnna',{error:problem(error)}));text('#connection',tr('disconnected'));controls(true);$('#refresh').disabled=false;$('#language').disabled=false;}
