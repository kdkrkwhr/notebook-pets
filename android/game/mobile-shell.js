import {cancelAI} from './native.js';

const $=id=>document.getElementById(id);
const icons={friend:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 10h9M7 14h6"/>',adventure:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',journal:'<path d="M4 4h13a3 3 0 0 1 3 3v14H6a2 2 0 0 1-2-2Zm0 13h16M8 8h8M8 12h5"/>'};
const labels={friend:'친구',chat:'대화',adventure:'모험',journal:'기록'};
let active='friend',panels={},nav,progress,progressTimer,aiId=null,aiStarted=0,pendingChat=null;

// Move the shared controls, retaining their handlers and the single game state.
export function mountMobile(){
  const game=$('game'), main=document.querySelector('main');
  const header=document.querySelector('.masthead');
  document.querySelector('.brand small').textContent='나만의 작은 친구';
  $('open-settings').textContent='설정';$('open-theme').textContent='테마';
  $('open-settings').append($('connection'));
  const settings=$('settings-dialog');
  const utilities=document.createElement('div');utilities.className='mobile-utilities';
  utilities.append($('open-theme'),$('refresh'),$('open-backup'),$('open-title'));
  settings.append(utilities,document.querySelector('.care-ai-options'));
  const careLabel=$('care-ai-enabled').parentElement;careLabel.lastChild.textContent=' 돌볼 때 친구의 답장 듣기';
  document.querySelector('.care-ai-options .hint-button')?.remove();
  document.querySelector('.care-ai-options [data-hint-for]')?.remove();
  document.querySelector('.intro').remove();
  document.querySelector('main > footer').remove();
  document.querySelector('.web-world-actions [data-help]')?.remove();
  document.querySelector('.web-world-actions .hint')?.remove();
  $('open-appearance').textContent='그림 바꾸기';

  for(const key of Object.keys(labels)){
    const panel=document.createElement('section');panel.id=`screen-${key}`;panel.className='mobile-screen';
    panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`tab-${key}`);panel.hidden=key!==active;
    panels[key]=panel;
  }
  panels.friend.append(document.querySelector('.pet-card'),document.querySelector('.web-world-actions'),document.querySelector('.care-card'));
  panels.friend.querySelector('.pet-heading').append(panels.friend.querySelector('#open-evolution'));
  const details=document.createElement('details');details.className='mobile-pet-details';
  const summary=document.createElement('summary');summary.textContent='능력치와 성격';details.append(summary,panels.friend.querySelector('#stats'));
  const help=panels.friend.querySelector('[data-i18n="battleRecordHelp"]');if(help)details.append(help);
  details.append(panels.friend.querySelector('.personality-details'));panels.journal.append(details);
  panels.friend.querySelector('.stats-help-row')?.remove();
  panels.friend.querySelector('.web-world-actions .explanation-help')?.remove();
  const chat=document.querySelector('.chat-card');chat.querySelector('h2').textContent='친구에게 이야기하기';panels.chat.append(chat);
  const draftInput=chat.querySelector('#message'),draftState=document.createElement('small');draftState.id='chat-draft-state';draftState.className='muted';chat.querySelector('.card-top').append(draftState);
  const showDraft=()=>{const state=draftInput.dataset.draftState;draftState.hidden=!draftInput.value;draftState.textContent=state==='saved'?'초안 저장됨':state==='saving'?'초안 저장 중…':'초안 저장 확인 필요';};
  document.addEventListener('draft-state',showDraft);showDraft();
  const adventure=document.createElement('section');adventure.className='paper mobile-outing';
  adventure.innerHTML='<span class="eyebrow">A LITTLE ADVENTURE</span><h2>오늘은 어디로 갈까?</h2><p>산책하며 이야기를 만나고, 숨겨진 던전을 발견해요.</p><div class="outing-actions"></div><p class="muted small">산책 기회는 한 시간마다 하나씩 채워져요.</p>';
  adventure.querySelector('.outing-actions').append(panels.friend.querySelector('[data-action="walk"]'),panels.friend.querySelector('#story-resume'));
  adventure.append(panels.friend.querySelector('#choices'));
  const result=document.createElement('p');result.id='outing-result';result.className='result';result.hidden=true;adventure.append(result);
  panels.adventure.append(adventure,$('dungeon-section'));
  panels.journal.append(document.querySelector('.quest-card'),document.querySelector('.album-card'),document.querySelector('.item-book-teaser'));
  game.replaceChildren(...Object.values(panels));
  nav=document.createElement('nav');nav.className='mobile-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','주요 화면');
  for(const key of Object.keys(labels)){
    const b=document.createElement('button');b.id=`tab-${key}`;b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-controls',`screen-${key}`);
    b.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</svg><b>${labels[key]}</b>`;b.onclick=()=>selectTab(key);nav.append(b);
  }
  nav.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=Object.keys(panels),i=keys.indexOf(active);selectTab(e.key==='Home'?keys[0]:e.key==='End'?keys.at(-1):keys[(i+(e.key==='ArrowRight'?1:3))%4]);$(`tab-${active}`).focus();};
  document.body.append(nav);
  const ai=document.createElement('section');ai.id='mobile-ai';ai.hidden=true;ai.setAttribute('role','status');
  ai.innerHTML='<span class="mobile-spinner" aria-hidden="true"></span><div><strong id="mobile-ai-label">친구가 생각하고 있어요</strong><small id="mobile-ai-time"></small></div><button id="mobile-ai-cancel" type="button">중지</button>';
  header.after(ai);progress=ai;
  $('mobile-ai-cancel').onclick=()=>{cancelAI();};
  const evolutionPreview=document.createElement('div');evolutionPreview.className='mobile-evolution-preview';
  evolutionPreview.innerHTML='<img alt="함께 자라는 친구"><p>돌봄과 모험을 쌓아 다음 성장을 준비해요.</p>';
  $('evolution-progress').after(evolutionPreview);
  const syncEvolution=()=>{evolutionPreview.hidden=$('evolution-routes').childElementCount>0;evolutionPreview.querySelector('img').src=$('pet-image').src;};
  new MutationObserver(syncEvolution).observe($('evolution-routes'),{childList:true});
  const notice=$('notice');notice.tabIndex=-1;
  const dismissNotice=document.createElement('button');dismissNotice.id='notice-dismiss';dismissNotice.type='button';dismissNotice.className='quiet';dismissNotice.textContent='알림 닫기';dismissNotice.hidden=true;
  notice.after(dismissNotice);dismissNotice.onclick=()=>{notice.textContent='';notice.hidden=true;dismissNotice.hidden=true;};
  let noticeTimer;
  const showNotice=()=>{
    notice.hidden=!notice.textContent.trim();clearTimeout(noticeTimer);
    // A failed save/request must stay readable until the user dismisses it.
    const ok=/^(오늘도 친구와|친구의 소식을 확인|이 기기에 친구와 그림을 저장|이 기기에 저장했습니다|공책을 초기화했어요|백업을 가져왔|그림을 저장했어요|이미 저장된 그림|행동과 친구의 반응을 확인|행동 결과를 확인)/.test(notice.textContent);
    notice.setAttribute('role',ok?'status':'alert');
    dismissNotice.hidden=ok||notice.hidden||notice.classList.contains('activity-running');
    if(ok)noticeTimer=setTimeout(()=>notice.hidden=true,6000);
  };
  new MutationObserver(showNotice).observe(notice,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});showNotice();
  new MutationObserver(()=>{result.textContent=$('result').textContent;result.hidden=false;}).observe($('result'),{childList:true,subtree:true,characterData:true});
  // Local replies also appear in the care screen, so an action never feels silent.
  const reply=document.createElement('button');reply.id='care-reply';reply.type='button';reply.className='care-reply';reply.hidden=true;reply.onclick=()=>selectTab('chat');
  $('result').after(reply);
  new MutationObserver(()=>{
    const last=document.querySelector('#messages .message.assistant:last-of-type .message-body');
    if(last){reply.textContent=`“${last.textContent}”  · 대화 보기`;reply.hidden=false;}
  }).observe($('messages'),{childList:true});
  const syncPet=()=>{nav.hidden=game.hidden;if(game.hidden)selectTab('friend');};
  new MutationObserver(syncPet).observe(game,{attributes:true,attributeFilter:['hidden']});syncPet();

  // Native Back closes an inner shop before leaving its world. Dialogs retain
  // their own cancel guards while saving or resolving a game action.
  const dialogChanged=()=>{
    const top=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(top?.id==='evolution-dialog')syncEvolution();
    document.body.classList.toggle('mobile-modal-open',!!top);
    if(progress&&!progress.hidden){
      const host=top??header.parentElement;
      if(progress.parentElement!==host){if(top)top.prepend(progress);else header.after(progress);}
    }
  };
  new MutationObserver(dialogChanged).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  window.NoteBuddyBack=()=>{
    const dialogs=[...document.querySelectorAll('dialog[open]')],dialog=dialogs.at(-1);
    if(dialog){
      if(dialog.id==='home-dialog'&&!$('home-shop-panel').hidden){$('home-shop-close').click();return true;}
      const event=new Event('cancel',{cancelable:true});if(dialog.dispatchEvent(event))dialog.close();return true;
    }
    if(active!=='friend'){selectTab('friend');return true;}return false;
  };
  window.addEventListener('native-ai',e=>{
    const {id,phase,text}=e.detail;
    if(phase==='start'){
      aiId=id;aiStarted=Date.now();progress.hidden=false;$('mobile-ai-cancel').disabled=false;
      $('mobile-ai-label').textContent='친구가 생각하고 있어요';
      clearInterval(progressTimer);progressTimer=setInterval(()=>{$('mobile-ai-time').textContent=`${Math.floor((Date.now()-aiStarted)/1000)}초 · 다른 화면도 볼 수 있어요`;},1000);
      $('mobile-ai-time').textContent='조금만 기다려 주세요';dialogChanged();
    }else if(id===aiId&&phase==='end'){
      clearInterval(progressTimer);progress.hidden=true;header.after(progress);aiId=null;
    }else if(id===aiId){
      $('mobile-ai-label').textContent=phase==='loading'?'친구가 생각하고 있어요':'친구가 답을 쓰고 있어요';
      if(text&&pendingChat){pendingChat.querySelector('.pending-answer').textContent=text;scrollChat();}
    }
  });
  window.addEventListener('native-keyboard',e=>document.body.classList.toggle('keyboard-open',!!e.detail));
  // The game opens directly, without the web landing screen on every launch.
  $('title-screen').close();selectTab('friend');document.body.classList.add('mobile-ready');
}
function scrollChat(){if(active==='chat')$('messages').scrollTop=$('messages').querySelector('.message')?$('messages').scrollHeight:0;}
export function selectTab(key){
  if(!panels[key])return;
  document.activeElement?.blur();active=key;document.body.dataset.screen=key;
  for(const [id,panel]of Object.entries(panels)){panel.hidden=id!==key;const b=$(`tab-${id}`);b.setAttribute('aria-selected',String(id===key));b.tabIndex=id===key?0:-1;}
  scrollChat();
}
export function chatStarted(input){
  pendingChat=document.createElement('div');pendingChat.className='pending-chat';
  const user=document.createElement('div');user.className='message user';user.textContent=input;
  const answer=document.createElement('div');answer.className='message assistant pending-answer';answer.textContent='생각하고 있어요…';
  pendingChat.append(user,answer);$('chat-empty').hidden=true;$('messages').append(pendingChat);
  $('message').readOnly=true;scrollChat();
  document.querySelectorAll('[data-prompt]').forEach(button=>button.disabled=true);
}
export function chatFinished(){pendingChat?.remove();pendingChat=null;$('message').readOnly=false;document.querySelectorAll('[data-prompt]').forEach(button=>button.disabled=false);$('chat-empty').hidden=!!document.querySelector('#messages .message');scrollChat();}
export function chatReceived(reply){if(pendingChat)pendingChat.querySelector('.pending-answer').textContent=reply;}
