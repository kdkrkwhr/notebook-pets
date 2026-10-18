// Deterministic host fault injection. No Anna account, network or paid AI.
const clone=value=>structuredClone(value);
const read=()=>JSON.parse(localStorage.getItem('test-host')||'{"sequence":0,"save":null,"kv":{}}');
const write=value=>localStorage.setItem('test-host',JSON.stringify(value));
const state=read();
const faults=JSON.parse(sessionStorage.getItem('test-faults')||'{}');
const calls=[];
window.hostTest={faults,calls,state};
const fixtureCanvas=document.createElement('canvas');fixtureCanvas.width=fixtureCanvas.height=64;
const fixtureContext=fixtureCanvas.getContext('2d');fixtureContext.fillStyle='white';fixtureContext.fillRect(0,0,64,64);fixtureContext.fillStyle='#607d68';fixtureContext.fillRect(14,10,36,46);fixtureContext.fillStyle='#253b35';fixtureContext.fillRect(21,25,5,5);fixtureContext.fillRect(38,25,5,5);
const portrait=fixtureCanvas.toDataURL('image/png');
const movementCanvas=document.createElement('canvas');movementCanvas.width=movementCanvas.height=256;
const movementContext=movementCanvas.getContext('2d');movementContext.fillStyle='#607d68';
for(let row=0;row<4;row++)for(let col=0;col<4;col++)movementContext.fillRect(col*64+18,row*64+16,24,32);
const movement=movementCanvas.toDataURL('image/png');
const dungeonEntries=()=>['hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity'].map(id=>({id,discovered:false,cleared:false,cost:1,reward:10,boss_element:id==='icekingdom'||id==='sunkenpalace'?'water':id==='hellgate'?'fire':id==='clockworkcity'?'earth':'nature',attack_multiplier:1,habitat_species:['fairy'],bonus_percent:10}));
function view(){if(state.save?.status?.dungeons)state.save.status.dungeons.server_now=Date.now()/1000;const home={coins:0,revision:0,catalog:[],owned:[],layout:{},reason:'',world:Object.fromEntries(['yard','inside'].map(place=>[place,{size:place==='yard'?[640,480]:[448,352],start:[224,208],objects:[],tour:[{route:[[224,208],[256,208]],pause:1,face:'right'}]}]))};return state.save?{ok:true,msg:'Saved',request_id_prefix:`nb2:${state.sequence}:`,home,...clone(state.save)}:{ok:false,code:'not_started',request_id_prefix:'nb2:0:',msg:'Meet your companion'};}
function create(name){return {pet_id:'isolated-fixture',stage:1,species_key:'fairy',element_key:'nature',image_prompt:'test companion',inventory:{normal_feed:3,rare_feed:0},album:{entries:[{stage:1,label:'Baby',reached:true,current:true,min_level:1}]},status:{name,species:'Fairy',element:'Nature',mood:'happy',title:'A little friend',level:1,stage_label:'Baby',xp:0,xp_next:100,satiety:70,intimacy:10,stats:{hp:10,atk:5,def:5},record:{win:0,lose:0},quest:{date:'2026-10-09',ready:false,claimed:false,reward:{xp:10,rare_feed:1},tasks:[]}}};}
const receipts=new Map();
const runtime={
 tools:{invoke:async request=>{
  const a=request.args;calls.push(clone(request));
  if(faults.permission)throw Error('permission denied');
  if(faults.evolutionCore&&['evolution_prepare','evolution_options','evolve'].includes(a.command)){
   const response=await fetch('/fixture-evolution',{method:'POST',body:JSON.stringify(a)}),result=await response.json();
   state.save={...state.save,...clone(result)};state.sequence++;write(state);
   if(faults.evolutionLost===a.command){faults.evolutionLost=null;throw Error('Evolution reply lost');}
   return {...result,request_id_prefix:`nb2:${state.sequence}:`};
  }
  if(faults.home&&a.command?.startsWith('home')){
   const response=await fetch('/fixture-home',{method:'POST',body:JSON.stringify(a)}),result=await response.json();
   if(a.command==='home_apply'&&faults.homeLost||a.command==='home_buy'&&faults.homeBuyLost){faults.homeLost=false;faults.homeBuyLost=false;throw Error('Home save reply lost');}
   state.save={...state.save,...clone(result)};state.sequence++;write(state);return {...result,request_id_prefix:`nb2:${state.sequence}:`};
  }
  if(request.method==='reset'){
   if(a.action==='inspect')return {ok:true,exists:!!state.save||!!faults.erased,erased:!!faults.erased,reset_from_erasure:!!state.resetFromErasure,etag:'game-etag',reset_pending:!!state.reset,reset_id:state.reset||state.lastReset};
   if(a.action==='begin'){
    if(state.lastReset===a.reset_id)return {ok:true,reset_complete:true,reset_id:a.reset_id};
    if(!state.reset){state.resetFromErasure=!!faults.erased;faults.erased=false;sessionStorage.setItem('test-faults',JSON.stringify({...JSON.parse(sessionStorage.getItem('test-faults')||'{}'),erased:false}));state.save=a.name?create(a.name):null;if(state.save)state.save.pet_id='reset-'+a.reset_id;state.sequence++;state.reset=a.reset_id;write(state);}
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
  if(a.command==='start'){state.save=create(a.name);if(a.birth_species){state.save.species_key=a.birth_species;state.save.status.species=a.birth_species;}if(a.birth_element&&a.birth_element!=='random'){state.save.element_key=a.birth_element;state.save.status.element=a.birth_element;}}
  else {state.save.status.xp+=['personality','walk_begin','walk_collect','walk_leave'].includes(a.command)?0:10;state.save.inventory.normal_feed-=a.command==='feed'?1:0;}
  if(a.command==='personality'&&!state.save.status.personality){const origin=JSON.parse(a.profile);state.save.status.personality={origin,values:Object.fromEntries(Object.entries(origin.traits).map(([k,v])=>[k,50+10*v])),changes:{}};}
  let extra={replayed:false};
  state.save.status.dungeons??={date:'2026-10-13',coins:0,entries:dungeonEntries(),last_run:null};
  if(['walk','walk_begin'].includes(a.command)&&faults.walkDiscovery!==false){const entries=state.save.status.dungeons.entries,now=Date.now()/1000;if(!entries.some(e=>e.discovered&&!e.cleared&&e.expires_at>now)){const entry=entries.find(e=>!e.cleared&&(!e.discovered||e.expires_at<=now));if(entry){entry.discovered=true;entry.expires_at=now+86400;extra.dungeon_discovered=entry.id;}}}
  if(faults.stageChoices&&a.command.startsWith('explore_')){
     const stateDungeon=state.save.status.dungeons,id=a.command.slice(8);
     let ex=stateDungeon.expedition;
     if(!ex||ex.phase!=='choice'){
      const index=ex?.index||0;
      ex={id:'fixture',dungeon_id:id,phase:'choice',choice_id:String(index+1).padStart(32,'0'),index,room_count:3,hp:12,max_hp:12,event:index===1?'trap':'fork'};
      stateDungeon.expedition=ex;
     }
     extra.dungeon_visit=clone(ex);
    }
    if(faults.stageChoices&&a.command.startsWith('dungeon_')){
     const d=state.save.status.dungeons,ex=d.expedition;
     if(ex?.phase==='choice'&&ex.choice_id===a.choice_id){
      const combat={outcome:'win',rounds:2,max_hp_me:12,max_hp_enemy:10,hp_me:8,hp_enemy:0,turns:[{hp_me:10,hp_enemy:5},{hp_me:8,hp_enemy:0}]};
      const complete=ex.index===2,coins=complete?10:0;
      const run={...combat,id:'fixture-run',format:'stage-v1',dungeon_id:ex.dungeon_id,choice:a.command.slice(8),event:ex.event,trap_damage:0,route_coins:0,coins_awarded:coins,complete,room_count:3,rooms:[{index:ex.index,kind:complete?'boss':'battle',enemy:complete?'guardian':ex.index?'bat':'slime',start_hp:12,combat}]};
      d.last_run=run;d.coins+=coins;d.expedition=complete?{}:{...ex,index:ex.index+1,phase:'next'};extra.dungeon_run=run;
      if(complete){d.entries.find(e=>e.id===ex.dungeon_id).discovered=false;if(faults.collectionReward){run.item_awarded=faults.collectionReward;state.save.status.collectibles??={};state.save.status.collectibles[faults.collectionReward]=1;}}
     }
    }
    if(!faults.stageChoices&&a.command.startsWith('explore_')){
   const id=a.command.slice(8),entry=state.save.status.dungeons.entries.find(x=>x.id===id);
   const run={id:'mock-expedition',date:'2026-10-13',dungeon_id:id,outcome:faults.dungeonLose?'lose':'win',coins_awarded:faults.dungeonLose?0:10,boss_element:entry.boss_element,bonus_percent:10,max_hp_me:12,max_hp_enemy:10,hp_me:8,hp_enemy:0,turns:[{hp_me:10,hp_enemy:5},{hp_me:8,hp_enemy:0}]};
   if(faults.multiRooms){
     const combat=clone(run);delete combat.rooms;
     run.room_count=6;run.rooms=Array.from({length:6},(_,index)=>({index,kind:index===5?'boss':index===3?'rest':'battle',enemy:index===5?'guardian':index===3?null:['slime','bat','beetle','sentinel'][index%4],start_hp:index?8:12,...(index===3?{hp_me:12}:{combat:clone(combat)})}));
   }
   state.save.status.dungeons.last_run=run;state.save.status.dungeons.coins+=run.coins_awarded;entry.cleared=!faults.dungeonLose;if(entry.cleared)entry.discovered=false;extra.dungeon_run=run;
  }
  if(['walk','walk_begin'].includes(a.command)&&faults.walkOutcome==='quiet'){extra.walk_outcome='quiet';state.save.status.encounter=null;}
  if(['walk','walk_begin'].includes(a.command)&&!['quiet','xp'].includes(faults.walkOutcome))state.save.status.encounter={species_key:'dragon',element_key:'fire',species:'Dragon',element:'Fire',level:1};
  if(a.command==='walk_begin'&&faults.walkOutcome==='xp'){extra.walk_outcome='xp';state.save.status.walk_choice={choice_id:'a'.repeat(32),reward:20};state.save.status.encounter=null;}
  if(faults.journey&&a.command==='walk_begin'){state.save.status.journey={choice_id:'b'.repeat(32),arc:'trail',chapter:1,prepared:true,basis:['feed','walk'],evidence:{actions:['feed'],missing:['train'],support_used:true},selection:'experience',variant:0,previous_choice:1,state:'pending',choice:null,coins:0,intimacy:0};}
  if(faults.journey&&['walk_collect','walk_leave'].includes(a.command)){const j=state.save.status.journey;if(j.state!=='done'){Object.assign(j,{state:'done',choice:a.command==='walk_collect'?0:1,intimacy:3});state.save.status.intimacy+=3;}extra.journey_result=clone(j);}
  if(!faults.journey&&['walk_collect','walk_leave'].includes(a.command)){const reward=a.command==='walk_collect'?state.save.status.walk_choice.reward:0;state.save.status.xp+=reward;extra.xp_result={gained:reward};state.save.status.walk_choice=null;}
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
 storage:{get:async({key})=>{if(faults.extras)throw Error('storage unavailable');const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reorder(x)])):v;return {value:faults.reorderStorage?reorder(clone(state.kv[key])):clone(state.kv[key]),etag:state.kv[key]?'etag':undefined};},set:async({key,value})=>{if(faults.save||faults.personalityDraftSave&&value?.state==='ready'&&value?.output?.traits||faults.reactionSave&&Array.isArray(value)&&value.some(x=>x.kind==='reaction'&&x.state==='done'))throw Error('storage unavailable');state.kv[key]=clone(value);write(state);if(faults.lostBirthSave&&Object.values(value||{}).some(x=>x?.phase==='done')){faults.lostBirthSave=false;throw Error('saved reply lost');}if(faults.lostSave){faults.lostSave=false;throw Error('saved reply lost');}return {}; }},
 llm:{complete:async options=>{calls.push({method:options.systemPrompt?.includes('fictional lifelong virtual pet personality')?'personality-llm':'llm',prompt:options.systemPrompt,messages:clone(options.messages)});if(faults.llmDelay)await new Promise(r=>setTimeout(r,faults.llmDelay));if(faults.llm)throw Error('insufficient credit');if(options.systemPrompt?.includes('THREE evolution paths')){if(faults.evolutionMalformed)return {content:{text:'invalid'}};const ctx=JSON.parse(options.messages[0].content[0].text);return {content:{text:JSON.stringify({features:'Round gold face, two ears, four paws, no wings.',memory:'We enjoy warm and quiet walks.',options:['keep',...ctx.routes.filter(r=>r.id!=='keep').slice(0,2).map(r=>r.id)].map(route_id=>({route_id,title:'Path '+route_id,reason:'Inspired by our walks together.',appearance:'Gold markings and a flowing aura.'}))})}};}if(options.systemPrompt?.includes('fictional lifelong virtual pet personality'))return {content:{text:faults.personalityMalformed?'bad':JSON.stringify({traits:{curiosity:1,warmth:0,energy:0,caution:1},summary:{en:'A curious friend inspired by the name and round face.',ko:'이름과 둥근 얼굴에서 시작한 호기심 많은 친구예요.'},voice:{en:'Short gentle sentences',ko:'짧고 다정하게 말해요'},habit:{en:'Tilts their head when curious',ko:'궁금할 때 고개를 갸웃해요'}})}};if(options.systemPrompt?.includes('Choose ONE candidate_id')){if(faults.homeMalformed)return {content:{text:'invalid'}};const request=JSON.parse(options.messages[0].content.text);return {content:{text:JSON.stringify({candidate_id:request.candidates[0].id,reason:'A quiet reading corner.'})}};}if(options.systemPrompt?.includes('virtual-pet walk vignette'))return {content:{text:faults.storyMalformed?'invalid':JSON.stringify({title:'A bell in the tree',scene:'Your friend hears a bell. Shall we listen?',choices:[{label:'Listen together',ending:'Your friend smiles at the gentle sound.'},{label:'Keep walking',ending:'You follow the quiet path together.'}]})}};if(options.messages?.[0]?.content instanceof Array)return {content:{text:faults.artMalformed?'yes':JSON.stringify({decision:faults.artDecision||'allow',features:faults.artFeatures||'round face and gold ears',species:faults.artSpecies||'fairy',element:faults.artElement||'nature',confidence:faults.artConfidence||'clear'})}};return {content:{text:'I am happy to see you!'}};}},
 image:{generate:async options=>{const home=options.prompt.includes('top-down pixel RPG');calls.push({method:home?'home-image':'image',options:clone(options)});if(faults.imageDelay)await new Promise(r=>setTimeout(r,faults.imageDelay));if(faults.imageRefusal)throw Error('content policy violation');if(faults.image||home&&faults.homeImage)throw Error('insufficient credit');if(home&&faults.homeSpriteSave||!home&&faults.evolutionSave)faults.save=true;return {images:[{url:home?(faults.homeSpriteSheet||movement):portrait}]};}},
 files:{list:async()=>({items:Object.entries(state.files||{}).map(([path,etag])=>({path,etag}))}),delete:async({path,if_match})=>{if(faults.delete)throw Error('delete unavailable');if(state.files[path]!==if_match)throw Error('conflict');delete state.files[path];calls.push({method:'delete',path});write(state);},upload_init:async()=>({put_url:'/fixture-upload',headers:{}}),upload_finalize:async({path})=>{calls.push({method:'finalize',path});if(faults.pixelUpload&&path.includes('/pixel-')){faults.pixelUpload=false;throw Error('pixel upload unavailable');}if(faults.birthUpload&&!path.includes('/source-')){faults.birthUpload=false;throw Error('upload unavailable');}if(faults.upload){faults.upload=false;throw Error('upload unavailable');}return {};},download_url:async({path})=>{calls.push({method:'download',path});if(faults.download)throw Error('portrait URL unavailable');return {get_url:faults.portraits?.[path]||(path.includes('/home-sprite-')&&(faults.homeSpriteSheet||movement))||portrait};}}
};
export const AnnaAppRuntime={connect:async()=>{calls.push({method:'connect'});if(faults.connect){faults.connect=false;throw Error('connect timed out');}return runtime;}};
