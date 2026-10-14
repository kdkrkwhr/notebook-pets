// Shown on every app load; it never waits for or blocks the connection behind it.
const passthrough=new Set(['Tab','Shift','Control','Alt','Meta','CapsLock']);

export function createTitleScreen(document,{privacy}){
 const dialog=document.querySelector('#title-screen'),menu=[...dialog.querySelectorAll('.title-menu button')];
 const close=next=>{if(dialog.open)dialog.close();next?.();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(!event.target.closest('button'))close();});
 dialog.addEventListener('keydown',event=>{
  if(passthrough.has(event.key)||event.ctrlKey||event.metaKey||event.altKey)return;
  const index=menu.indexOf(document.activeElement);
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();menu[(Math.max(index,0)+(event.key==='ArrowDown'?1:menu.length-1))%menu.length].focus();return;
  }
  if(index>=0&&(event.key==='Enter'||event.key===' '))return;
  event.preventDefault();close();
 });
 document.querySelector('#title-start').addEventListener('click',()=>close());
 document.querySelector('#title-privacy').addEventListener('click',()=>close(privacy));
 return {
  show(){if(!dialog.open)dialog.showModal();menu[0].focus();},
  isOpen:()=>dialog.open,
 };
}
