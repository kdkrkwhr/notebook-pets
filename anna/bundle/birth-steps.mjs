// Presentation only: the welcome form remains the single source of the start request.
export function currentBirthStep({mode,artReady,name}){
 if(mode==='art'&&!artReady)return 'mode';
 return name.trim()?'meet':'name';
}

export function createBirthSteps(document){
 const $=s=>document.querySelector(s),order=['mode','name','meet'];
 const preview=$('#birth-art-choice .art-source-preview');
 function render(){
  const current=currentBirthStep({mode:$('#birth-mode').value,artReady:!preview.hidden,name:$('#pet-name').value});
  for(const item of document.querySelectorAll('#birth-steps [data-step]')){
   const offset=order.indexOf(item.dataset.step)-order.indexOf(current);
   item.dataset.state=offset<0?'done':offset===0?'current':'todo';
   if(offset===0)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');
  }
 }
 $('#birth-mode').addEventListener('change',render);$('#pet-name').addEventListener('input',render);
 new MutationObserver(render).observe(preview,{attributes:true,attributeFilter:['hidden']});
 render();
 return {render};
}
