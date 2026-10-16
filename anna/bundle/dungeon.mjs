import {t} from './i18n.mjs';
import {items} from './items.mjs';
import {createDungeonScene,paintDungeon,WALK_MS,ROUND_MS} from './dungeon-scene.mjs';
import {journey,totalDuration} from './dungeon-journey.mjs';
export {routePosition} from './dungeon-scene.mjs';
export const DUNGEON_IDS=['hellgate','icekingdom','dreamforest','sunkenpalace','clockworkcity'];

export function createDungeons(h){
  const document=h.document,$=id=>document.querySelector(id),dialog=$('#dungeon-dialog');
  let selected=null,run=null,raf=null,elapsed=0,lastTime=0,speed=1,finished=false,artReady=false,ambient=0,previewTicket=0,paused=false;
  const scene=createDungeonScene($('#dungeon-map'),$('#dungeon-explorer'));
  const reduced=()=>document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let clockState=null,serverTime=0,receivedAt=0;
  const tr=(key,values)=>t(h.language(),key,values);
  function now(){
    const state=h.view()?.status?.dungeons;
    if(state!==clockState){clockState=state;serverTime=Number.isFinite(state?.server_now)?state.server_now*1000:Date.now();receivedAt=performance.now();}
    return serverTime+performance.now()-receivedAt;
  }
  const remaining=entry=>Math.max(0,Math.ceil((entry.expires_at*1000-now())/1000));
  const countdown=entry=>{const seconds=remaining(entry);return seconds?tr('dungeonCountdown',{time:[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')}):tr('dungeonExpired');};
  function updateTimers(){
    const state=h.view()?.status?.dungeons;
    if(!state)return;
    for(const card of document.querySelectorAll('.dungeon-card')){
      const entry=state.entries.find(e=>e.id===card.dataset.dungeon);
      if(!entry||remaining(entry)<=0){card.remove();continue;}
      card.querySelector('.dungeon-countdown').textContent=countdown(entry);
    }
    $('#dungeon-section').hidden=!$('#dungeon-list').childElementCount&&!state.expedition?.id;
    if(dialog.open){
      $('#dungeon-countdown').hidden=!!run;
      if(!run){
        const entry=state.entries.find(e=>e.id===selected);
        $('#dungeon-countdown').textContent=entry?countdown(entry):tr('dungeonExpired');
        if(!entry||remaining(entry)<=0){$('#dungeon-enter').disabled=true;$('#dungeon-enter').textContent=tr('dungeonExpired');}
      }
    }
  }
  const stop=()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;$('#dungeon-explorer').classList.remove('walking');};
  function portrait(){
    const img=$('#dungeon-explorer');img.crossOrigin='anonymous';img.onerror=null;img.src=h.pixelUrl()||h.portraitUrl();img.alt=h.view()?.status?.name||'';
  }
  function health(frame){
    if(!run)return;
    const active=journey(run,finished?totalDuration(run):elapsed,finished);const combat=active.room.combat;
    $('#dungeon-your-hp').max=run.max_hp_me;$('#dungeon-boss-hp').max=combat?.max_hp_enemy||1;
    $('#dungeon-your-hp').value=frame.hp_me;$('#dungeon-boss-hp').value=frame.hp_enemy;
    $('#dungeon-boss-hp').parentElement.hidden=active.room.kind==='rest';
    $('#dungeon-hp-text').textContent=active.room.kind==='rest'?`${Math.ceil(frame.hp_me)} / ${run.max_hp_me}`:`${Math.ceil(frame.hp_me)} / ${run.max_hp_me} · ${Math.ceil(frame.hp_enemy)} / ${combat?.max_hp_enemy||0}`;
  }
  function choiceUI(){
    const ex=h.view()?.status?.dungeons?.expedition;
    const visible=!!run?.pending&&elapsed>=WALK_MS;
    $('#dungeon-choice').hidden=!visible;
    if(!visible)return;
    $('#dungeon-choice-title').textContent=tr('dungeonEvent_'+run.event);
    $('#dungeon-choice-hint').textContent=tr(run.event==='sanctuary'?'dungeonRestChoice':'dungeonRiskHint');
    $('#dungeon-safe').textContent=tr(run.event==='sanctuary'?'dungeonHeal':'dungeonSafe');
    $('#dungeon-risk').textContent=tr(run.event==='sanctuary'?'dungeonSearch':'dungeonRisk');
    for(const id of ['#dungeon-safe','#dungeon-risk'])$(id).disabled=h.locked()||ex?.choice_id!==run.choice_id;
  }
  function visit(ex){
    if(!ex||ex.phase!=='choice')return;
    const saved={pending:true,event:ex.event,choice_id:ex.choice_id,dungeon_id:ex.dungeon_id,room_count:ex.room_count,max_hp_me:ex.max_hp,hp_me:ex.hp,rooms:[{index:ex.index,kind:'rest',enemy:null,start_hp:ex.hp,hp_me:ex.hp}],turns:[]};
    preview(ex.dungeon_id,saved);$('#dungeon-enter').hidden=true;$('#dungeon-hp').hidden=false;
    $('#dungeon-entry-hint').textContent=tr('dungeonPaid');$('#dungeon-skip').hidden=true;$('#dungeon-fast').hidden=true;
    if(reduced())elapsed=WALK_MS;
    choiceUI();
  }
  function finish(){
    stop();finished=true;elapsed=totalDuration(run);health(run);scene.draw({elapsed,run,finished,reduced:reduced()});
    $('#dungeon-phase').textContent=tr(`battle_${run.outcome}`);$('#dungeon-room').textContent=tr('dungeonRoom',{current:journey(run,elapsed,true).index+1,total:run.room_count||1});$('#dungeon-pause').hidden=true;
    $('#dungeon-result').textContent=run.format==='stage-v1'?tr(run.complete?'dungeonReward':run.outcome==='win'?'dungeonStageDone':'dungeonStageLost',{coins:run.coins_awarded,damage:run.trap_damage}):tr(run.coins_awarded?'dungeonReward':'dungeonRetry',{coins:run.coins_awarded});
    if(Object.hasOwn(run,'item_awarded')){
      const item=items.find(i=>i.id===run.item_awarded),ko=h.language()==='ko';
      $('#dungeon-result').textContent+=item?(ko?` · 획득: ${item.name[1]}`:` · Collected: ${item.name[0]}`):(ko?' · 이 지역의 아이템을 모두 모았어요.':' · Regional collection complete.');
    }
    const next=h.view()?.status?.dungeons?.expedition;
    $('#dungeon-enter').hidden=!(next?.phase==='next'&&next.dungeon_id===selected);
    $('#dungeon-enter').textContent=tr('dungeonNextEntry');$('#dungeon-enter').disabled=h.locked();
    $('#dungeon-skip').textContent=tr('close');$('#dungeon-fast').hidden=true;
  }
  function tick(now){
    if(!dialog.open)return stop();
    const delta=document.hidden?0:Math.min(100,Math.max(0,now-lastTime));lastTime=now;
    if(run&&!finished&&artReady&&!paused)elapsed+=delta*speed;else ambient+=delta;
    if(run&&!finished){
      const active=journey(run,elapsed);
      if(active.done){finish();return;}
      $('#dungeon-room').textContent=tr('dungeonRoom',{current:active.index+1,total:active.total});
      $('#dungeon-phase').textContent=tr(active.phase==='choice'?'dungeonChoose':paused?'dungeonPaused':active.phase==='rest'?'dungeonRest':active.phase==='exit'?'dungeonNext':active.phase==='battle'?'battlePlaying':'dungeonMoving');
      $('#dungeon-boss-name').textContent=tr(active.room.kind==='rest'?'dungeonRest':active.room.enemy==='guardian'?'boss_'+selected:'enemy_'+active.room.enemy);
      health(active.frame||{hp_me:active.room.start_hp,hp_enemy:active.room.combat?.max_hp_enemy||0});
    }
    choiceUI();
    scene.draw({elapsed:run?elapsed:ambient,run,finished,reduced:reduced()});
    if(!reduced()||run&&!finished)raf=requestAnimationFrame(tick);
  }
  function preview(key,saved=null){
    $('#dungeon-choice').hidden=true;
    const ticket=++previewTicket;
    stop();selected=key;run=saved;finished=false;elapsed=0;ambient=0;artReady=false;paused=false;
    portrait();
    void scene.load(key,{sprite:h.spriteUrl(),fallback:h.portraitUrl()}).then(ok=>{if(ticket!==previewTicket||!dialog.open)return;artReady=ok;if(!ok){stop();$('#dungeon-phase').textContent=tr('dungeonArtFailed');}render();scene.draw({elapsed,run,finished,reduced:reduced()});});
    $('#dungeon-heading').textContent=tr(`dungeon_${key}`);
    $('#dungeon-boss-name').textContent=tr(`boss_${key}`);
    $('#dungeon-phase').textContent=tr(`dungeonScene_${key}`);
    $('#dungeon-result').textContent='';$('#dungeon-pause').hidden=true;$('#dungeon-pause').textContent=tr('dungeonPause');$('#dungeon-room').textContent=tr('dungeonRoomCount',{total:h.view()?.status?.dungeons?.entries.find(e=>e.id===key)?.room_count||'3–6'});$('#dungeon-hp').hidden=true;
    $('#dungeon-countdown').hidden=false;
    $('#dungeon-skip').hidden=true;$('#dungeon-fast').hidden=true;
    if(!dialog.open)dialog.showModal();render();lastTime=performance.now();raf=requestAnimationFrame(tick);
  }
  function show(saved){
    if(!saved||!DUNGEON_IDS.includes(saved.dungeon_id)||!Array.isArray(saved.turns))return;
    preview(saved.dungeon_id,saved);elapsed=0;speed=1;finished=false;
    $('#dungeon-enter').hidden=true;$('#dungeon-hp').hidden=false;$('#dungeon-pause').hidden=false;
    $('#dungeon-countdown').hidden=true;
    $('#dungeon-entry-hint').textContent=tr('dungeonSaved');
    $('#dungeon-skip').hidden=false;$('#dungeon-skip').textContent=tr('battleSkip');
    $('#dungeon-fast').hidden=false;$('#dungeon-fast').textContent=tr('dungeonFast');
    $('#dungeon-result').textContent=tr('dungeonSaved');
    health({hp_me:run.max_hp_me,hp_enemy:run.max_hp_enemy});
    if(document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    lastTime=performance.now();
  }
  function render(){
    const view=h.view(),state=view?.status?.dungeons;
    const entries=state?.entries?.filter(entry=>entry.discovered&&DUNGEON_IDS.includes(entry.id)&&remaining(entry)>0)||[];
    $('#dungeon-section').hidden=!entries.length&&!state?.expedition?.id;
    $('#dungeon-list').replaceChildren();
    if(!state)return;
    $('#dungeon-coins').textContent=tr('dungeonCoins',{coins:state.coins});
    for(const entry of entries){
      const card=document.createElement('button');card.type='button';card.className=`dungeon-card ${entry.id}`;card.dataset.dungeon=entry.id;card.disabled=h.locked();
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');paintDungeon(canvas,entry.id);
      const name=document.createElement('strong');name.textContent=tr(`dungeon_${entry.id}`);
      const status=document.createElement('span');status.textContent=tr(entry.cleared?'dungeonCleared':entry.discovered?'dungeonFound':'dungeonLocked');
      const timer=document.createElement('span');timer.className='dungeon-countdown';timer.textContent=countdown(entry);
      card.append(canvas,name,status,timer);card.addEventListener('click',()=>state.expedition?.phase==='choice'?visit(state.expedition):preview(entry.id));$('#dungeon-list').append(card);
    }
    if(state.expedition?.phase==='choice'&&!entries.some(e=>e.id===state.expedition.dungeon_id)){const resume=document.createElement('button');resume.textContent=tr('dungeonContinuePaid');resume.disabled=h.locked();resume.onclick=()=>visit(state.expedition);$('#dungeon-list').append(resume);}
    if(dialog.open&&!run){
      const entry=entries.find(value=>value.id===selected);if(!entry){updateTimers();return;}
      const favorable=entry.habitat_species.map(value=>tr('species_'+value)).join(' · ');
      $('#dungeon-details').textContent=tr('dungeonDetails',{element:tr('element_'+entry.boss_element),multiplier:entry.attack_multiplier,bonus:entry.bonus_percent,species:favorable,coins:entry.reward});
      $('#dungeon-enter').hidden=false;$('#dungeon-enter').disabled=!artReady||h.locked()||!entry.discovered||entry.cleared||!!view.status.encounter;
      $('#dungeon-enter').textContent=tr(state.expedition?.phase==='next'?'dungeonNextEntry':entry.cleared?'dungeonCleared':!entry.discovered?'dungeonLocked':'dungeonEnter');
      $('#dungeon-entry-hint').textContent=tr(view.status.encounter?'dungeonEncounter':'dungeonEntryHint');
    }
    if(finished&&run){const next=state.expedition;$('#dungeon-enter').hidden=!(next?.phase==='next'&&next.dungeon_id===selected);$('#dungeon-enter').disabled=h.locked()||!entries.some(e=>e.id===selected);}
    if(dialog.open&&view.ok===false)$('#dungeon-result').textContent=view.msg||'';
    choiceUI();updateTimers();
  }
  for(const choice of ['safe','risk'])$('#dungeon-'+choice).addEventListener('click',()=>{if(run?.pending&&elapsed>=WALK_MS&&!h.locked())h.act('dungeon_'+choice,{choice_id:run.choice_id});});
  $('#dungeon-enter').addEventListener('click',()=>{const entry=h.view()?.status?.dungeons?.entries.find(e=>e.id===selected);if(artReady&&!h.locked()&&entry?.discovered&&!entry.cleared&&remaining(entry)>0)h.act(`explore_${selected}`);});
  $('#dungeon-skip').addEventListener('click',()=>finished?dialog.close():finish());
  $('#dungeon-fast').addEventListener('click',()=>{speed=speed===1?3:1;$('#dungeon-fast').textContent=tr(speed===1?'dungeonFast':'dungeonNormal');});
  $('#dungeon-pause').addEventListener('click',()=>{paused=!paused;$('#dungeon-pause').textContent=tr(paused?'dungeonResume':'dungeonPause');});
  $('#dungeon-close').addEventListener('click',()=>dialog.close());
  const closeScene=()=>{stop();++previewTicket;artReady=false;scene.clear();};
  dialog.addEventListener('close',closeScene);dialog.addEventListener('cancel',closeScene);
  document.defaultView.setInterval(updateTimers,1000);
  document.addEventListener('visibilitychange',updateTimers);
  document.defaultView.addEventListener('resize',()=>{if(dialog.open)scene.draw({elapsed:run?elapsed:ambient,run,finished,reduced:reduced()});});
  return {render,show,visit,close(){closeScene();dialog.close();selected=null;run=null;}};
}
