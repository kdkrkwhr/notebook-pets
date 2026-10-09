// Keep a missing/deployment-incomplete module from leaving a blank loading screen.
import('./app.js').catch(()=>{
 let korean=false;
 try{korean=localStorage.getItem('notebuddy/language-v1')==='ko';}catch{}
 const message=document.querySelector('#notice');
 message.textContent=korean?'화면을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요. 저장된 게임은 삭제되지 않습니다.':'The app could not load. Refresh to try again. Your saved game has not been deleted.';
 message.hidden=false;
 document.querySelector('#connection').textContent=korean?'화면 로딩 실패':'Could not load';
 const button=document.querySelector('#refresh');button.disabled=false;
 button.onclick=()=>location.reload();
});
