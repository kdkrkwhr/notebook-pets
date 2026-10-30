// Keep a missing/deployment-incomplete module from leaving a blank loading screen.
import('./app.js').catch(()=>{
 let language='en';
 try{language=localStorage.getItem('notebuddy/language-v1')||'en';}catch{}
 const emergency={
  en:['The app could not load. Refresh to try again. Your saved game has not been deleted.','Could not load'],
  ko:['화면을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요. 저장된 게임은 삭제되지 않습니다.','화면 로딩 실패'],
  ja:['画面を読み込めませんでした。更新してもう一度お試しください。保存済みのゲームは削除されていません。','読み込みに失敗しました'],
  'zh-Hans':['无法加载画面。请刷新后重试。已保存的游戏未被删除。','加载失败'],
  'zh-Hant':['無法載入畫面。請重新整理後再試。已儲存的遊戲並未刪除。','載入失敗']
 };
 const copy=emergency[language]||emergency.en;
 const message=document.querySelector('#notice');
 message.textContent=copy[0];
 message.hidden=false;
 document.querySelector('#connection').textContent=copy[1];
 const button=document.querySelector('#refresh');button.disabled=false;
 button.onclick=()=>location.reload();
});
