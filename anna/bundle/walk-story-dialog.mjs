// Presentation only: closing never repeats a walk or generates a second story.
export function createStoryDialog(h){
 const d=h.document,$=id=>d.querySelector(id),dialog=$('#walk-story');
 let dismissed=false,last={current:null,working:false,feedback:''};
 const close=()=>{dismissed=true;dialog.close();render(last);($('#story-resume').hidden?$('[data-action="walk"]'):$('#story-resume')).focus();};
 function open(){if(!dialog.open&&!d.querySelector('dialog[open]')){dialog.showModal();$('#story-heading').focus();}}
 function render(state){
  last=state;const {working,feedback}=state;
  const current=working&&state.current?.state==='done'?null:state.current,done=current?.state==='done';
  const active=!!h.view()?.status,pending=working||!!current&&!done;
  if(!active){dismissed=false;if(dialog.open)dialog.close();$('#story-resume').hidden=true;return;}
  $('#story-heading').textContent=current?.story.title||h.tr('storyHeading');
  $('#story-scene').textContent=current?.story.scene||'';
  $('#story-status').textContent=feedback?h.tr(feedback):working?h.tr('storyWorking'):current?.fallback?h.tr('storyFallback'):'';
  $('#story-choices').replaceChildren();
  if(current&&!done&&!working)current.story.choices.forEach((choice,index)=>{
   const button=d.createElement('button');button.type='button';button.className='story-choice';button.textContent=choice.label;button.disabled=h.locked();button.onclick=()=>h.choose(index);$('#story-choices').append(button);
  });
  $('#story-ending').textContent=done?current.story.choices[current.choice].ending:'';$('#story-ending').hidden=!done;
  $('#story-done').hidden=!done;$('#story-done').textContent=h.tr('storyDone');
  if(pending&&!dismissed)open();
  $('#story-resume').hidden=!pending||dialog.open;$('#story-resume').disabled=h.locked();
  $('[data-action="walk"]').disabled=h.locked()||pending;
 }
 $('#story-close').onclick=close;$('#story-done').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('#story-resume').onclick=()=>{dismissed=false;open();render(last);};
 return {render,begin(){dismissed=false;},clear(){dismissed=false;last={current:null,working:false,feedback:''};dialog.close();$('#story-resume').hidden=true;}};
}
