import {journeyInfluence} from './journey-stories.mjs';
// Rendering saved state never opens a dialog. Only an explicit outing/resume does.
export function createStoryDialog(h){
 const d=h.document,$=id=>d.querySelector(id),dialog=$('#walk-story');
 let mode='result',message='',last={current:null,working:false,feedback:''};
 const pending=()=>last.working||!!last.current&&last.current.state!=='done';
 const close=()=>{dialog.close();h.closeBattle?.();render(last);h.closed?.();($('#story-resume').hidden?$('[data-action="walk"]'):$('#story-resume')).focus();};
 function open(){if(!dialog.open&&!d.querySelector('dialog[open]')){dialog.showModal();$('#story-heading').focus();}}
 function render(state){
  last=state;
  if(!h.view()?.status){dialog.close();$('#story-resume').hidden=true;return;}
  const current=state.working&&state.current?.state==='done'?null:state.current,done=current?.state==='done';
  const story=mode==='story',battle=mode.startsWith('battle'),encounter=!!h.view()?.status?.encounter,choice=h.view()?.status?.walk_choice;
  const choosing=!!choice&&mode!=='loading';
  $('#story-heading').textContent=story?(current?.story.title||h.tr('storyHeading')):h.tr(battle?'battleHeading':'walk');
  $('#story-scene').textContent=story?current?.story.scene||'':choosing?h.tr('walkXPScene',{xp:choice.reward}):message;
  const influence=story?journeyInfluence(current?.journey,h.language?.()||current?.language||'en'):'';
  $('#story-influence').textContent=influence;$('#story-influence').hidden=!influence;
  $('#story-status').textContent=story?(state.feedback?h.tr(state.feedback):state.working?h.tr('storyWorking'):current?.fallback?h.tr('storyFallback'):''):'';
  $('#story-choices').replaceChildren();
  if(story&&current&&!done&&!state.working)current.story.choices.forEach((choice,index)=>{
   const button=d.createElement('button');button.type='button';button.className='story-choice';button.textContent=choice.label;button.disabled=h.locked();button.onclick=()=>h.choose(index);$('#story-choices').append(button);
  });
  if(choosing)for(const action of ['collect','leave']){const button=d.createElement('button');button.type='button';button.className='story-choice';button.textContent=h.tr(action==='collect'?'walkCollect':'walkLeave',{xp:choice.reward});button.disabled=h.locked();button.onclick=()=>h.act('walk_'+action,{choice_id:choice.choice_id});$('#story-choices').append(button);}
  $('#story-ending').textContent=story&&done?current.story.choices[current.choice].ending+(current.result?' '+current.result:''):'';$('#story-ending').hidden=!story||!done;
  $('#encounter').hidden=!encounter||battle||story;
  $('#story-done').hidden=battle||mode==='loading'||story&&!done||encounter||choosing;
  $('#story-done').textContent=h.tr('storyDone');
  $('#story-usage').hidden=!story;
  $('.story-footer').hidden=!story&&$('#story-done').hidden;
  const discovery=h.view()?.status?.dungeons?.entries?.find(e=>e.discovered&&!e.cleared&&e.expires_at>Date.now()/1000);
  $('#walk-discovery').hidden=!discovery||mode==='loading'||battle&&mode!=='battleDone'||story&&!done||encounter||choosing;
  if(discovery){$('#walk-discovery-text').textContent=h.tr('dungeonDiscovered',{name:h.tr('dungeon_'+discovery.id)});$('#walk-dungeon').onclick=()=>{close();h.openDungeon(discovery.id);};}
  $('#walk-retry').hidden=!h.retryPending();$('#walk-retry').disabled=h.busy();
  $('#story-resume').hidden=dialog.open||!(pending()||encounter||choice);$('#story-resume').disabled=h.locked();
  $('[data-action="walk"]').disabled=h.locked();
 }
 $('#story-close').onclick=close;$('#story-done').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('#walk-retry').onclick=()=>h.retry();
 const resume=()=>{h.closeBattle?.();mode=pending()?'story':'result';message='';render(last);open();render(last);};
 $('#story-resume').onclick=resume;
 return {render,resume,close,
  isOpen:()=>dialog.open,
  hasPending:()=>pending()||!!h.view()?.status?.encounter||!!h.view()?.status?.walk_choice,
  loading(){h.closeBattle?.();mode='loading';message=h.tr('working');render(last);open();},
  result(value){mode='result';message=value;render(last);},
  battle(){mode='battle';message='';render(last);},
  battleFinished(){mode='battleDone';render(last);},
  begin(){mode='story';render(last);},
  clear(){mode='result';message='';last={current:null,working:false,feedback:''};dialog.close();$('#story-resume').hidden=true;}
 };
}
