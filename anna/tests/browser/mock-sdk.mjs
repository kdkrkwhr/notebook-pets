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
  if(request.method==='reset'){
   if(faults.erased)return {ok:false,erased:true};
   if(a.action==='inspect')return {ok:true,exists:!!state.save,etag:'game-etag',reset_pending:!!state.reset,reset_id:state.reset||state.lastReset};
   if(a.action==='begin'){
    if(state.lastReset===a.reset_id)return {ok:true,reset_complete:true,reset_id:a.reset_id};
    if(!state.reset){state.save=create(a.name);state.save.pet_id='reset-'+a.reset_id;state.sequence++;state.reset=a.reset_id;write(state);}
    if(faults.resetLost){faults.resetLost=false;throw Error('begin reply lost');}
    return {ok:true,reset_pending:true,reset_id:state.reset};
   }
   state.lastReset=state.reset;state.reset=null;write(state);
   if(faults.finishLost){faults.finishLost=false;throw Error('finish reply lost');}
   return {ok:true,reset_complete:true,reset_id:a.reset_id};
  }
  if(state.reset)return {ok:false,reset_pending:true,reset_id:state.reset};
  if(request.method==='privacy'){
   if(a.action==='erase')throw Error('offline before removal');
   return {ok:true,exists:!!state.save,etag:'game-etag',erased:false};
  }
  if(a.command==='status'){if(faults.erased)return {ok:false,erased:true,code:'data_erased'};if(faults.status)throw Error('offline');return view();}
  if(faults.delay)await new Promise(r=>setTimeout(r,faults.delay));
  if(receipts.has(a.request_id))return {...clone(receipts.get(a.request_id)),replayed:true};
  if(a.command==='start')state.save=create(a.name);
  else {state.save.status.xp+=10;state.save.inventory.normal_feed-=a.command==='feed'?1:0;}
  let extra={replayed:false};
  if(a.command==='walk')state.save.status.encounter={species_key:'dragon',element_key:'fire',species:'Dragon',element:'Fire',level:1};
  if(a.command==='battle'){
   extra={...extra,opponent:state.save.status.encounter,outcome:'win',max_hp_me:10,max_hp_enemy:10,hp_me:6,hp_enemy:0,
    turns:[{round:1,hp_me:8,hp_enemy:5},{round:2,hp_me:6,hp_enemy:0}],xp_result:{gained:10}};
   state.save.status.encounter=null;
  }
  if(faults.evolve){const stage=faults.evolve;faults.evolve=0;state.save.stage=stage;state.save.status.level=stage===2?10:stage===3?30:50;state.save.status.stage_label='Stage '+stage;state.save.album.entries=Array.from({length:stage},(_,i)=>({stage:i+1,label:'Stage '+(i+1),reached:true,current:i+1===stage,min_level:i?10:1}));extra.xp_result={gained:10,evolutions:[stage]};}
  if(a.command==='flee')state.save.status.encounter=null;
  state.sequence++;write(state);const response={...view(),...extra};receipts.set(a.request_id,response);
  if(faults.lost){faults.lost=false;throw Error('timed out after commit');}
  return response;
 }},
 storage:{get:async({key})=>{if(faults.extras)throw Error('storage unavailable');return {value:clone(state.kv[key]),etag:state.kv[key]?'etag':undefined};},set:async({key,value})=>{if(faults.save)throw Error('storage unavailable');state.kv[key]=clone(value);write(state);if(faults.lostSave){faults.lostSave=false;throw Error('saved reply lost');}return {}; }},
 llm:{complete:async()=>{calls.push({method:'llm'});if(faults.llmDelay)await new Promise(r=>setTimeout(r,faults.llmDelay));if(faults.llm)throw Error('insufficient credit');return {content:{text:'I am happy to see you!'}};}},
 image:{generate:async options=>{calls.push({method:'image',options:clone(options)});if(faults.imageDelay)await new Promise(r=>setTimeout(r,faults.imageDelay));if(faults.image)throw Error('insufficient credit');return {images:[{url:portrait}]};}},
 files:{list:async()=>({items:Object.entries(state.files||{}).map(([path,etag])=>({path,etag}))}),delete:async({path,if_match})=>{if(faults.delete)throw Error('delete unavailable');if(state.files[path]!==if_match)throw Error('conflict');delete state.files[path];calls.push({method:'delete',path});write(state);},upload_init:async()=>({put_url:'/fixture-upload',headers:{}}),upload_finalize:async()=>{calls.push({method:'finalize'});if(faults.upload){faults.upload=false;throw Error('upload unavailable');}return {};},download_url:async({path})=>{calls.push({method:'download',path});if(faults.download)throw Error('portrait URL unavailable');return {get_url:portrait};}}
};
export const AnnaAppRuntime={connect:async()=>{calls.push({method:'connect'});if(faults.connect){faults.connect=false;throw Error('connect timed out');}return runtime;}};
