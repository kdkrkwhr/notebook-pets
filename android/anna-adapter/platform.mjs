// Presentation/lifecycle hooks only; no gameplay handlers or additional steps.
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./mobile.css',import.meta.url).href;document.head.append(stylesheet);
window.addEventListener('native-keyboard',event=>{
 document.documentElement.dataset.keyboard=event.detail?'open':'closed';
 if(event.detail&&document.activeElement?.matches('input,textarea'))requestAnimationFrame(()=>document.activeElement?.scrollIntoView({block:'nearest',behavior:'instant'}));
});
