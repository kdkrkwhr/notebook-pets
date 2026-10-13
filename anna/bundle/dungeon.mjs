import {t} from './i18n.mjs';
import {createDungeonScene,paintDungeon,WALK_MS,ROUND_MS} from './dungeon-scene.mjs';
export {routePosition} from './dungeon-scene.mjs';
export const DUNGEON_IDS=['hellgate','icekingdom','dreamforest'];

export function createDungeons(h){
  const document=h.document,$=id=>document.querySelector(id),dialog=$('#dungeon-dialog');
  let selected=null,run=null,raf=null,elapsed=0,lastTime=0,speed=1,finished=false,artReady=false,ambient=0,previewTicket=0;
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
    $('#dungeon-section').hidden=!$('#dungeon-list').childElementCount&&!state.last_run;
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
    const img=$('#dungeon-explorer');img.src=h.pixelUrl()||h.portraitUrl();img.alt=h.view()?.status?.name||'';
    img.onerror=()=>{img.onerror=null;img.src=h.portraitUrl();};
  }
  function health(frame){
    if(!run)return;
    $('#dungeon-your-hp').max=run.max_hp_me;$('#dungeon-boss-hp').max=run.max_hp_enemy;
    $('#dungeon-your-hp').value=frame.hp_me;$('#dungeon-boss-hp').value=frame.hp_enemy;
    $('#dungeon-hp-text').textContent=`${Math.ceil(frame.hp_me)} / ${run.max_hp_me} · ${Math.ceil(frame.hp_enemy)} / ${run.max_hp_enemy}`;
  }
  function finish(){
    stop();finished=true;health(run);scene.draw({elapsed,run,finished,reduced:reduced()});
    $('#dungeon-phase').textContent=tr(`battle_${run.outcome}`);
    $('#dungeon-result').textContent=tr(run.coins_awarded?'dungeonReward':'dungeonRetry',{coins:run.coins_awarded});
    $('#dungeon-skip').textContent=tr('close');$('#dungeon-fast').hidden=true;
  }
  function tick(now){
    if(!dialog.open)return stop();
    const delta=document.hidden?0:Math.min(100,Math.max(0,now-lastTime));lastTime=now;
    if(run&&!finished&&artReady)elapsed+=delta*speed;else ambient+=delta;
    if(run&&!finished){
      const progress=Math.min(1,elapsed/WALK_MS);
      if(progress<1)$('#dungeon-phase').textContent=tr(progress<.35?'dungeonMoving':progress<.65?'dungeonCache':'dungeonApproach');
      else{
        $('#dungeon-phase').textContent=tr('battlePlaying');
        const index=Math.floor((elapsed-WALK_MS)/ROUND_MS),phase=((elapsed-WALK_MS)%ROUND_MS)/ROUND_MS;
        if(index>=run.turns.length){finish();return;}
        health(phase>=.55?run.turns[index]:index?run.turns[index-1]:{hp_me:run.max_hp_me,hp_enemy:run.max_hp_enemy});
      }
    }
    scene.draw({elapsed:run?elapsed:ambient,run,finished,reduced:reduced()});
    if(!reduced()||run&&!finished)raf=requestAnimationFrame(tick);
  }
  function preview(key,saved=null){
    const ticket=++previewTicket;
    stop();selected=key;run=saved;finished=false;elapsed=0;ambient=0;artReady=false;
    portrait();
    void scene.load(key).then(ok=>{if(ticket!==previewTicket||!dialog.open)return;artReady=ok;if(!ok){stop();$('#dungeon-phase').textContent=tr('dungeonArtFailed');}render();scene.draw({elapsed,run,finished,reduced:reduced()});});
    $('#dungeon-heading').textContent=tr(`dungeon_${key}`);
    $('#dungeon-boss-name').textContent=tr(`boss_${key}`);
    $('#dungeon-phase').textContent=tr(`dungeonScene_${key}`);
    $('#dungeon-result').textContent='';$('#dungeon-hp').hidden=true;
    $('#dungeon-countdown').hidden=false;
    $('#dungeon-skip').hidden=true;$('#dungeon-fast').hidden=true;
    if(!dialog.open)dialog.showModal();render();lastTime=performance.now();raf=requestAnimationFrame(tick);
  }
  function show(saved){
    if(!saved||!DUNGEON_IDS.includes(saved.dungeon_id)||!Array.isArray(saved.turns))return;
    preview(saved.dungeon_id,saved);elapsed=0;speed=1;finished=false;
    $('#dungeon-enter').hidden=true;$('#dungeon-hp').hidden=false;
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
    $('#dungeon-section').hidden=!entries.length&&!state?.last_run;
    $('#dungeon-list').replaceChildren();
    if(!state)return;
    $('#dungeon-coins').textContent=tr('dungeonCoins',{coins:state.coins});
    $('#dungeon-date').textContent=tr('dungeonDate',{date:state.date});
    for(const entry of entries){
      const card=document.createElement('button');card.type='button';card.className=`dungeon-card ${entry.id}`;card.dataset.dungeon=entry.id;card.disabled=h.locked();
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');paintDungeon(canvas,entry.id);
      const name=document.createElement('strong');name.textContent=tr(`dungeon_${entry.id}`);
      const status=document.createElement('span');status.textContent=tr(entry.cleared?'dungeonCleared':entry.discovered?'dungeonFound':'dungeonLocked');
      const timer=document.createElement('span');timer.className='dungeon-countdown';timer.textContent=countdown(entry);
      card.append(canvas,name,status,timer);card.addEventListener('click',()=>preview(entry.id));$('#dungeon-list').append(card);
    }
    $('#dungeon-replay').hidden=!state.last_run;$('#dungeon-replay').disabled=h.locked();
    if(dialog.open&&!run){
      const entry=entries.find(value=>value.id===selected);if(!entry){updateTimers();return;}
      const favorable=entry.habitat_species.map(value=>tr('species_'+value)).join(' · ');
      $('#dungeon-details').textContent=tr('dungeonDetails',{element:tr('element_'+entry.boss_element),multiplier:entry.attack_multiplier,bonus:entry.bonus_percent,species:favorable,coins:entry.reward});
      $('#dungeon-enter').hidden=false;$('#dungeon-enter').disabled=!artReady||h.locked()||!entry.discovered||entry.cleared||!!view.status.encounter;
      $('#dungeon-enter').textContent=tr(entry.cleared?'dungeonCleared':!entry.discovered?'dungeonLocked':'dungeonEnter');
      $('#dungeon-entry-hint').textContent=tr(view.status.encounter?'dungeonEncounter':'dungeonEntryHint');
    }
    updateTimers();
  }
  $('#dungeon-enter').addEventListener('click',()=>{const entry=h.view()?.status?.dungeons?.entries.find(e=>e.id===selected);if(artReady&&!h.locked()&&entry?.discovered&&!entry.cleared&&remaining(entry)>0)h.act(`explore_${selected}`);});
  $('#dungeon-replay').addEventListener('click',()=>{if(!h.locked())show(h.view()?.status?.dungeons?.last_run);});
  $('#dungeon-skip').addEventListener('click',()=>finished?dialog.close():finish());
  $('#dungeon-fast').addEventListener('click',()=>{speed=speed===1?3:1;$('#dungeon-fast').textContent=tr(speed===1?'dungeonFast':'dungeonNormal');});
  $('#dungeon-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
  document.defaultView.setInterval(updateTimers,1000);
  document.addEventListener('visibilitychange',updateTimers);
  document.defaultView.addEventListener('resize',()=>{if(dialog.open)scene.draw({elapsed:run?elapsed:ambient,run,finished,reduced:reduced()});});
  return {render,show,close(){stop();dialog.close();selected=null;run=null;}};
}
