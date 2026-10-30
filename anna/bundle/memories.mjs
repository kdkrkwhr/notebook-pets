import {MEMORIES,erased,ErasedError,mergeSaved,savedValue} from './data.mjs';
import {memoryText,memoryRegion} from './memory-text.mjs';

const byteLength=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const timestamp=value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=8640000000000000;
export class MemoryError extends Error{constructor(code){super(code);this.name='MemoryError';this.code=code;}}
const fail=code=>{throw new MemoryError(code);};
function entry(value){
 if(!object(value)||Object.keys(value).some(key=>!['id','role','text','at'].includes(key))||typeof value.id!=='string'||!/^msg-[a-f0-9]{16}$/.test(value.id)||!['user','assistant'].includes(value.role)||typeof value.text!=='string'||!value.text.trim()||value.at!==null&&!timestamp(value.at))fail('invalid');
 if(value.text.length>3000)fail('long');
 return {id:value.id,role:value.role,text:value.text,at:value.at};
}
export function keepsake(message){
 if(!object(message)||!['user','assistant'].includes(message.role)||typeof message.text!=='string'||!message.text.trim()||message.at!=null&&!timestamp(message.at)||message.state&&message.state!=='done'||message.kind==='reaction'&&message.state!=='done')fail('invalid');
 if(message.text.length>3000)fail('long');
 // Stable across reloads, including old chat records that predate message IDs.
 const source=JSON.stringify([message.id??null,message.role,message.text,message.at??null]);let a=2166136261,b=2246822507;
 for(let i=0;i<source.length;i++){a=Math.imul(a^source.charCodeAt(i),16777619);b=Math.imul(b^source.charCodeAt(i),3266489909);}
 return entry({id:`msg-${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`,role:message.role,text:message.text,at:message.at??null});
}
export function normalizeMemories(value,pet){
 if(typeof pet!=='string'||!pet||pet.length>160)fail('changed');
 if(erased(value))throw new ErasedError();
 if(value===undefined||object(value)&&Object.keys(value).length===0)return {version:1,pet_id:pet,entries:[]};
 if(!object(value)||Object.keys(value).some(key=>!['version','pet_id','entries'].includes(key))||value.version!==1||value.pet_id!==pet||!Array.isArray(value.entries))fail(value?.pet_id&&value.pet_id!==pet?'changed':'invalid');
 if(value.entries.length>20)fail('full');
 const entries=value.entries.map(entry);if(new Set(entries.map(e=>e.id)).size!==entries.length)fail('invalid');
 const result={version:1,pet_id:pet,entries};if(byteLength(result)>40000)fail('bytes');return result;
}
export function changeMemory(value,pet,operation){
 const current=normalizeMemories(value,pet);
 if(operation.add){const add=entry(operation.add),old=current.entries.find(e=>e.id===add.id);if(old){if(JSON.stringify(old)!==JSON.stringify(add))fail('invalid');return current;}current.entries.push(add);}
 else if(typeof operation.remove==='string')current.entries=current.entries.filter(e=>e.id!==operation.remove);
 else fail('invalid');
 return normalizeMemories(current,pet);
}
export function writeMemory(storage,active,pet,operation){
 return mergeSaved(storage,MEMORIES,old=>changeMemory(old,pet,operation),async()=>{
  const state=await active();if(state?.erased)throw new ErasedError();
  if(!state?.status||state.reset_pending||state.pet_id!==pet)fail('changed');
 });
}

export function createMemories(h){
 const d=h.document,$=selector=>d.querySelector(selector),dialog=$('#memories-dialog');
 const tr=(key,values)=>memoryText(h.language(),key,values);
 let pet=null,saved=null,loading=false,working=false,loaded=false,loadError=null,pending=null,status='',epoch=0,opener=null;
 const blocked=()=>h.locked()||loading||working||!loaded||!!loadError||!!pending;
 const node=(tag,text,className)=>{const e=d.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
 function date(at){if(!timestamp(at))return null;const time=node('time',new Intl.DateTimeFormat(h.language(),{dateStyle:'medium'}).format(new Date(at)));time.dateTime=new Date(at).toISOString();return time;}
 function errorKey(error,fallback){return error instanceof MemoryError?error.code:error instanceof ErasedError?'changed':fallback;}
 function sync(){
  for(const button of d.querySelectorAll('.memory-save')){const found=saved?.entries.some(e=>e.id===button.dataset.memoryId);button.textContent=tr(found?'saved':'save');button.disabled=blocked()||!!found||!h.completed(button.memoryMessage);}
  for(const button of d.querySelectorAll('.memory-remove'))button.disabled=blocked();
  $('#memory-retry').disabled=h.locked()||working||loading;
  $('#memory-close').disabled=false;
  $('#open-memories').disabled=!h.view()?.status||!!h.view()?.reset_pending;
 }
 function render(){
  for(const e of d.querySelectorAll('[data-memory-text]'))e.textContent=tr(e.dataset.memoryText);
  const list=$('#memory-milestones');list.replaceChildren();
  for(const event of h.view()?.memories||[]){
   if(!event||!['met','evolved','dungeon'].includes(event.kind))continue;
   const region=memoryRegion(h.language(),event.region);if(event.kind==='dungeon'&&!region)continue;
   const stage=h.view()?.album?.entries.find(e=>e.stage===event.stage)?.label||tr('stage',{stage:event.stage});
   if(event.kind==='evolved'&&(!Number.isInteger(event.stage)||event.stage<2||event.stage>4))continue;
   const item=node('li'),label=node('strong',tr(event.kind,{stage,region})),time=date(typeof event.at==='number'?event.at*1000:null);
   item.append(label);if(time)item.append(time);list.append(item);
  }
  $('#memory-milestones-empty').hidden=!!list.children.length;
  const focusedRemove=d.activeElement?.classList.contains('memory-remove')?d.activeElement.dataset.memoryId:null;
  const notes=$('#memory-notes');notes.replaceChildren();
  for(const note of saved?.entries||[]){
   const item=node('li'),head=node('div',undefined,'memory-note-head'),label=node('strong',note.role==='user'?tr('you'):h.view()?.status?.name||tr('friend')),time=date(note.at),text=node('p',note.text,'memory-note-text'),remove=node('button',tr('remove'),'quiet memory-remove');
   remove.type='button';remove.dataset.memoryId=note.id;remove.addEventListener('click',()=>void save({remove:note.id}));head.append(label);if(time)head.append(time);item.append(head,text,remove);notes.append(item);
  }
  $('#memory-empty').hidden=loading||!!loadError||!!notes.children.length;
  $('#memory-count').textContent=loaded&&!loadError?`${saved?.entries.length||0} / 20`:'';
  const feedback=$('#memory-status'),message=loading?'loading':working?'saving':loadError||status;
  feedback.textContent=message?tr(message):'';feedback.hidden=!message;
  const retry=$('#memory-retry');retry.hidden=!loadError&&!pending;retry.textContent=tr(pending?'retrySave':'retryLoad');
  const chatFeedback=$('#memory-chat-status');chatFeedback.textContent=status?tr(status):'';chatFeedback.hidden=!status;
  sync();
  if(focusedRemove&&dialog.open)([...notes.querySelectorAll('button')].find(e=>e.dataset.memoryId===focusedRemove&&!e.disabled)||$('#memory-close')).focus();
 }
 function clear(){epoch++;pet=null;saved=null;loaded=false;loading=false;working=false;pending=null;status='';loadError=null;if(dialog.open)dialog.close();render();}
 function update(){if(pet&&pet!==h.view()?.pet_id)clear();render();}
 async function load(view){
  if(!view?.status||view.erased||view.reset_pending){clear();return;}
  // A same-companion refresh must not invalidate an in-flight save result.
  if(working&&pet===view.pet_id)return;
  if(pet&&pet!==view.pet_id)clear();pet=view.pet_id;const token=++epoch;loading=true;loaded=false;loadError=null;render();
  try{const row=await h.anna().storage.get({key:MEMORIES});if(token!==epoch||h.view()?.pet_id!==pet)return;saved=normalizeMemories(savedValue(row),pet);loaded=true;}
  catch(error){if(token===epoch){saved=null;loadError=errorKey(error,'loadError');}}
  finally{if(token===epoch){loading=false;render();}}
 }
 async function save(operation){
  if(h.locked()||working||loading||!loaded||loadError)return;
  const expected=pet,token=epoch;pending={pet:expected,operation};working=true;status='';render();
  try{const value=await writeMemory(h.anna().storage,h.active,expected,operation);if(token!==epoch||pet!==expected)return;saved=value;pending=null;status='done';}
  catch(error){if(token===epoch){status=errorKey(error,'saveError');if(error instanceof MemoryError||error instanceof ErasedError)pending=null;}}
  finally{if(token===epoch){working=false;render();}}
 }
 function attach(container,message){
  if(!h.completed(message))return;let note;try{note=keepsake(message);}catch{return;}
  const button=node('button',tr('save'),'quiet memory-save');button.type='button';button.dataset.memoryId=note.id;button.memoryMessage=message;
  button.addEventListener('click',()=>{if(!blocked()&&h.completed(message))void save({add:note});});container.append(button);sync();
 }
 $('#open-memories').addEventListener('click',()=>{opener=d.activeElement;render();dialog.showModal();$('#memory-close').focus();});
 $('#memory-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
 $('#memory-retry').addEventListener('click',()=>{if(pending)void save(pending.operation);else void load(h.view());});
 render();return {load,clear,update,render,sync,attach};
}
