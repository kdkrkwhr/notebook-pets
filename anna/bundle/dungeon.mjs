import {t} from './i18n.mjs';

export const DUNGEON_IDS=['hellgate','icekingdom','dreamforest'];
const ROUTE=[[10,14],[10,12],[5,12],[5,9],[13,9],[13,6],[10,6],[10,3]];
const THEMES={
  hellgate:{ground:'#251c2c',shade:'#352338',detail:'#513045',floor:'#65516a',edge:'#977482',glow:'#ff9860',light:'#ffdf9e',liquid:'#ad3c37'},
  icekingdom:{ground:'#162f49',shade:'#203f59',detail:'#315c77',floor:'#8dbcc8',edge:'#d0eef0',glow:'#6ce7ee',light:'#eefaff',liquid:'#326787'},
  dreamforest:{ground:'#152a32',shade:'#1c3b3e',detail:'#2b514b',floor:'#697360',edge:'#a4ad7d',glow:'#a898f5',light:'#ebd7ff',liquid:'#373451'},
};
export function routePosition(progress){
  const distances=ROUTE.slice(1).map((point,i)=>Math.abs(point[0]-ROUTE[i][0])+Math.abs(point[1]-ROUTE[i][1]));
  let distance=Math.max(0,Math.min(1,progress))*distances.reduce((a,b)=>a+b,0);
  for(let i=0;i<distances.length;i++){
    if(distance<=distances[i]){const ratio=distance/distances[i];return ROUTE[i].map((value,axis)=>(value+(ROUTE[i+1][axis]-value)*ratio)*16+8);}
    distance-=distances[i];
  }
  return ROUTE.at(-1).map(v=>v*16+8);
}

export function paintDungeon(canvas,key){
  const c=canvas.getContext('2d'),p=THEMES[key]||THEMES.hellgate;
  canvas.width=320;canvas.height=256;c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const noise=(x,y)=>(x*37+y*71+x*y*13)%101;
  rect(0,0,320,256,p.ground);
  for(let y=0;y<16;y++)for(let x=0;x<20;x++){
    rect(x*16+1,y*16+1,14,14,noise(x,y)>55?p.shade:p.ground);
    if(noise(x,y)>60)rect(x*16+3,y*16+6,3,2,p.detail);
  }
  // A continuous walkable route with outlined stone slabs.
  const tiles=new Set();
  for(let i=1;i<ROUTE.length;i++){
    const [ax,ay]=ROUTE[i-1],[bx,by]=ROUTE[i];
    for(let x=Math.min(ax,bx);x<=Math.max(ax,bx);x++)for(let y=Math.min(ay,by);y<=Math.max(ay,by);y++)tiles.add(`${x},${y}`);
  }
  for(const tile of tiles){const [x,y]=tile.split(',').map(Number);rect(x*16-2,y*16-2,20,20,p.detail);}
  for(const tile of tiles){const [x,y]=tile.split(',').map(Number);rect(x*16,y*16,16,16,p.floor);rect(x*16+1,y*16+1,14,2,p.edge);rect(x*16+3,y*16+12,8,1,p.detail);}
  const crystal=(x,y)=>{rect(x+5,y,5,4,p.light);rect(x+2,y+4,11,12,p.glow);rect(x,y+8,15,5,p.glow);rect(x+5,y+5,3,10,p.light);rect(x+3,y+16,10,3,p.detail);};
  const tree=(x,y)=>{rect(x+6,y+17,5,10,'#705550');rect(x+3,y+4,12,18,p.detail);rect(x,y+9,19,10,'#43655a');rect(x+4,y,10,12,'#527164');rect(x+5,y+5,3,3,'#8b9c71');};
  for(const [x,y] of [[32,64],[256,80],[48,176],[264,192],[112,96],[208,176],[48,32],[272,32]]){
    if(key==='icekingdom')crystal(x,y);
    else if(key==='dreamforest')tree(x,y);
    else{rect(x,y+8,20,12,p.liquid);rect(x+3,y+5,13,5,p.glow);rect(x+7,y+2,5,8,p.light);rect(x+1,y+21,19,3,p.detail);}
  }
  if(key==='dreamforest')for(const [x,y] of [[144,180],[64,128],[244,138],[196,64]]){rect(x+4,y+5,3,6,p.light);rect(x,y,11,6,p.glow);rect(x+3,y+1,2,2,p.light);}
  // The boss gate and a small, region-specific pixel silhouette.
  rect(138,10,62,35,p.detail);rect(144,16,50,30,p.floor);rect(153,21,32,30,p.ground);
  rect(138,10,62,4,p.edge);rect(138,10,6,40,p.edge);rect(194,10,6,40,p.edge);
  rect(154,35,30,18,p.shade);rect(158,26,22,19,p.glow);rect(161,32,4,3,p.ground);rect(173,32,4,3,p.ground);
  if(key==='hellgate'){rect(153,21,5,12,p.light);rect(180,21,5,12,p.light);rect(153,18,3,5,p.light);rect(182,18,3,5,p.light);}
  if(key==='icekingdom'){rect(156,23,27,4,p.light);for(const x of [156,167,179])rect(x,17,4,7,p.glow);rect(165,39,8,8,p.light);}
  if(key==='dreamforest'){rect(153,17,3,15,p.edge);rect(183,17,3,15,p.edge);rect(148,20,9,3,p.edge);rect(182,20,9,3,p.edge);rect(166,38,7,4,p.light);}
  // A roadside cache is visual only; the committed boss result awards the coins.
  rect(113,164,18,13,'#654850');rect(115,164,14,5,p.light);rect(120,168,4,5,p.glow);
  rect(160,237,16,3,p.glow);
}

export function createDungeons(h){
  const document=h.document,$=id=>document.querySelector(id),dialog=$('#dungeon-dialog');
  let selected=null,run=null,raf=null,elapsed=0,lastTime=0,speed=1,finished=false;
  const tr=(key,values)=>t(h.language(),key,values);
  const stop=()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;$('#dungeon-explorer').classList.remove('walking');};
  function position(progress){const [x,y]=routePosition(progress);$('#dungeon-explorer').style.left=`${x/320*100}%`;$('#dungeon-explorer').style.top=`${y/256*100}%`;}
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
    stop();finished=true;position(1);health(run);
    $('#dungeon-phase').textContent=tr(`battle_${run.outcome}`);
    $('#dungeon-result').textContent=tr(run.coins_awarded?'dungeonReward':'dungeonRetry',{coins:run.coins_awarded});
    $('#dungeon-skip').textContent=tr('close');$('#dungeon-fast').hidden=true;
  }
  function tick(now){
    if(!dialog.open||!run)return stop();
    // Hidden tabs do not farm or advance outcomes; this clock only replays a saved result.
    if(!document.hidden)elapsed+=Math.min(100,Math.max(0,now-lastTime))*speed;
    lastTime=now;
    const progress=Math.min(1,elapsed/10500);position(progress);
    if(progress<1){
      $('#dungeon-phase').textContent=tr(progress<.35?'dungeonMoving':progress<.72?'dungeonCache':'dungeonApproach');
    }else{
      $('#dungeon-explorer').classList.remove('walking');
      $('#dungeon-phase').textContent=tr('battlePlaying');
      const index=Math.floor((elapsed-10500)/400);
      if(index>=run.turns.length){finish();return;}
      health(run.turns[index]);
    }
    raf=requestAnimationFrame(tick);
  }
  function preview(key){
    stop();selected=key;run=null;finished=false;
    paintDungeon($('#dungeon-map'),key);portrait();position(0);
    $('#dungeon-heading').textContent=tr(`dungeon_${key}`);
    $('#dungeon-boss-name').textContent=tr(`boss_${key}`);
    $('#dungeon-phase').textContent=tr(`dungeonScene_${key}`);
    $('#dungeon-result').textContent='';$('#dungeon-hp').hidden=true;
    $('#dungeon-skip').hidden=true;$('#dungeon-fast').hidden=true;
    if(!dialog.open)dialog.showModal();render();
  }
  function show(saved){
    if(!saved||!DUNGEON_IDS.includes(saved.dungeon_id)||!Array.isArray(saved.turns))return;
    preview(saved.dungeon_id);run=saved;elapsed=0;speed=1;finished=false;
    $('#dungeon-enter').hidden=true;$('#dungeon-hp').hidden=false;
    $('#dungeon-entry-hint').textContent=tr('dungeonSaved');
    $('#dungeon-skip').hidden=false;$('#dungeon-skip').textContent=tr('battleSkip');
    $('#dungeon-fast').hidden=false;$('#dungeon-fast').textContent=tr('dungeonFast');
    $('#dungeon-result').textContent=tr('dungeonSaved');
    health({hp_me:run.max_hp_me,hp_enemy:run.max_hp_enemy});
    if(document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    $('#dungeon-explorer').classList.add('walking');lastTime=performance.now();raf=requestAnimationFrame(tick);
  }
  function render(){
    const view=h.view(),state=view?.status?.dungeons;
    $('#dungeon-section').hidden=!state;
    if(!state)return;
    $('#dungeon-coins').textContent=tr('dungeonCoins',{coins:state.coins});
    $('#dungeon-date').textContent=tr('dungeonDate',{date:state.date});
    $('#dungeon-list').replaceChildren();
    for(const entry of state.entries){
      if(!DUNGEON_IDS.includes(entry.id))continue;
      const card=document.createElement('button');card.type='button';card.className=`dungeon-card ${entry.id}`;card.dataset.dungeon=entry.id;card.disabled=h.locked();
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');paintDungeon(canvas,entry.id);
      const name=document.createElement('strong');name.textContent=tr(`dungeon_${entry.id}`);
      const status=document.createElement('span');status.textContent=tr(entry.cleared?'dungeonCleared':entry.discovered?'dungeonFound':'dungeonLocked');
      card.append(canvas,name,status);card.addEventListener('click',()=>preview(entry.id));$('#dungeon-list').append(card);
    }
    $('#dungeon-replay').hidden=!state.last_run;$('#dungeon-replay').disabled=h.locked();
    if(dialog.open&&!run){
      const entry=state.entries.find(value=>value.id===selected);if(!entry)return;
      const favorable=entry.habitat_species.map(value=>tr('species_'+value)).join(' · ');
      $('#dungeon-details').textContent=tr('dungeonDetails',{element:tr('element_'+entry.boss_element),multiplier:entry.attack_multiplier,bonus:entry.bonus_percent,species:favorable,coins:entry.reward});
      $('#dungeon-enter').hidden=false;$('#dungeon-enter').disabled=h.locked()||!entry.discovered||entry.cleared||!!view.status.encounter;
      $('#dungeon-enter').textContent=tr(entry.cleared?'dungeonCleared':!entry.discovered?'dungeonLocked':'dungeonEnter');
      $('#dungeon-entry-hint').textContent=tr(view.status.encounter?'dungeonEncounter':'dungeonEntryHint');
    }
  }
  $('#dungeon-enter').addEventListener('click',()=>{if(!h.locked()&&selected)h.act(`explore_${selected}`);});
  $('#dungeon-replay').addEventListener('click',()=>{if(!h.locked())show(h.view()?.status?.dungeons?.last_run);});
  $('#dungeon-skip').addEventListener('click',()=>finished?dialog.close():finish());
  $('#dungeon-fast').addEventListener('click',()=>{speed=speed===1?3:1;$('#dungeon-fast').textContent=tr(speed===1?'dungeonFast':'dungeonNormal');});
  $('#dungeon-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
  return {render,show,close(){stop();dialog.close();selected=null;run=null;}};
}
