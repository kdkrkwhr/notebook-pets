// One bounded draft per notebook, scoped to its pet AND replacement epoch.
// IndexedDB completion acknowledges the write. localStorage is a migration
// fallback: WebView may buffer it past Android force-stop.
export function createDrafts(document,storage,database){
 const input=document.getElementById('message'),key=`${database}/chat-draft-v1`,idb=document.defaultView.indexedDB;
 let context=null,generation=0,operation=0,connection;
 const state=value=>{if(input.dataset)input.dataset.draftState=value;document.dispatchEvent(new CustomEvent('draft-state',{detail:value}));};
 function open(){
  if(!idb)return Promise.resolve(null);
  return connection??=new Promise((resolve,reject)=>{const r=idb.open(database+'-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Draft storage unavailable'));});
 }
 async function durable(value,read=false){
  const db=await open();if(!db)return null;
  return new Promise((resolve,reject)=>{
   const tx=read?db.transaction('drafts','readonly'):db.transaction('drafts','readwrite',{durability:'strict'}),store=tx.objectStore('drafts');
   const r=read?store.get('current'):value?store.put(value,'current'):store.delete('current');
   tx.oncomplete=()=>resolve(read?r.result:true);tx.onabort=()=>reject(tx.error??Error('Draft save failed'));tx.onerror=()=>{};
  });
 }
 function local(value){try{if(value)storage?.setItem(key,JSON.stringify(value));else storage?.removeItem(key);return !!storage;}catch{return false;}}
 function cached(){try{const raw=storage?.getItem(key);return raw&&raw.length<10000?JSON.parse(raw):null;}catch{return null;}}
 async function write(){
  if(!context)return;
  const ticket=++operation,session=generation,text=input.value.slice(0,500),value=text?{...context,text,at:Date.now()}:null;
  state(text?'saving':'');const fallback=local(value);
  try{const saved=await durable(value);if(ticket===operation&&session===generation)state(text?(saved||!idb&&fallback?'saved':'failed'):'');}
  catch{if(ticket===operation&&session===generation)state(text?'failed':'');}
 }
 async function session(pet,epoch){
  const current=++generation;++operation;context=pet?{pet,epoch}:null;
  let saved=cached();
  try{const disk=await durable(null,true);if(disk&&(!saved||Number(disk.at??0)>=Number(saved.at??0)))saved=disk;}catch{}
  if(current!==generation)return;
  if(context&&saved?.pet===pet&&saved.epoch===epoch&&typeof saved.text==='string'){
   input.value=saved.text.slice(0,500);
   try{await durable({...saved,text:input.value});if(current===generation)state(input.value?'saved':'');}
   catch{if(current===generation)state(input.value?'failed':'');}
  }else{input.value='';local(null);await durable(null).catch(()=>{});state('');}
 }
 async function clear(){const ticket=++operation,session=generation;local(null);await durable(null).catch(()=>{});if(ticket===operation&&session===generation)state('');}
 input.addEventListener('input',write);
 document.defaultView.addEventListener('pagehide',write);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)write();});
 return {session,write,clear};
}
