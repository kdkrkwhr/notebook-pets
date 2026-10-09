// Deterministic host fault injection. No Anna account, network or paid AI.
const clone=value=>structuredClone(value);
const read=()=>JSON.parse(localStorage.getItem('test-host')||'{"sequence":0,"save":null,"kv":{}}');
const write=value=>localStorage.setItem('test-host',JSON.stringify(value));
const state=read();
const faults=JSON.parse(sessionStorage.getItem('test-faults')||'{}');
const calls=[];
window.hostTest={faults,calls,state};
const portrait='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>');
function view(){return state.save?{ok:true,msg:'Saved',request_id_prefix:`nb2:${state.sequence}:`,...clone(state.save)}:{ok:false,code:'not_started',request_id_prefix:'nb2:0:',msg:'Meet your companion'};}
function create(name){return {pet_id:'isolated-fixture',stage:1,species_key:'fairy',element_key:'nature',image_prompt:'test companion',inventory:{normal_feed:3,rare_feed:0},album:{entries:[{stage:1,label:'Baby',reached:true,current:true,min_level:1}]},status:{name,species:'Fairy',element:'Nature',mood:'happy',title:'A little friend',level:1,stage_label:'Baby',xp:0,xp_next:100,satiety:70,intimacy:10,stats:{hp:10,atk:5,def:5},record:{win:0,lose:0},quest:{date:'2026-10-09',ready:false,claimed:false,reward:{xp:10,rare_feed:1},tasks:[]}}};}
const receipts=new Map();
const runtime={
 tools:{invoke:async request=>{
  const a=request.args;calls.push(clone(request));
  if(faults.permission)throw Error('permission denied');
  if(request.method==='privacy'){
   if(a.action==='erase')throw Error('offline before removal');
   return {ok:true,exists:!!state.save,etag:'game-etag',erased:false};
  }
  if(a.command==='status'){if(faults.status)throw Error('offline');return view();}
  if(faults.delay)await new Promise(r=>setTimeout(r,faults.delay));
  if(receipts.has(a.request_id))return clone(receipts.get(a.request_id));
  if(a.command==='start')state.save=create(a.name);
  else {state.save.status.xp+=10;state.save.inventory.normal_feed-=a.command==='feed'?1:0;}
  state.sequence++;write(state);const response=view();receipts.set(a.request_id,response);
  if(faults.lost){faults.lost=false;throw Error('timed out after commit');}
  return response;
 }},
 storage:{get:async({key})=>{if(faults.extras)throw Error('storage unavailable');return {value:clone(state.kv[key]),etag:state.kv[key]?'etag':undefined};},set:async({key,value})=>{if(faults.save)throw Error('storage unavailable');state.kv[key]=clone(value);write(state);return {}; }},
 llm:{complete:async()=>{calls.push({method:'llm'});if(faults.llm)throw Error('insufficient credit');return {content:{text:'I am happy to see you!'}};}},
 image:{generate:async()=>{calls.push({method:'image'});return {images:[{url:portrait}]};}},
 files:{upload_init:async()=>({put_url:'/fixture-upload',headers:{}}),upload_finalize:async()=>{calls.push({method:'finalize'});if(faults.upload){faults.upload=false;throw Error('upload unavailable');}return {};},download_url:async()=>({get_url:portrait})}
};
export const AnnaAppRuntime={connect:async()=>{calls.push({method:'connect'});if(faults.connect){faults.connect=false;throw Error('connect timed out');}return runtime;}};
