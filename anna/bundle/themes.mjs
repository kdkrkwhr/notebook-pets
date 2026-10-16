// Appearance is a local preference, independent of the game and AI runtime.
export const THEME_KEY='notebuddy/theme-v1';
export const themes=[
 {id:'notebook',icon:'▤',en:['Notebook','Warm paper and familiar green'],ko:['기본 공책','따뜻한 종이와 익숙한 초록빛']},
 {id:'night',icon:'☾',en:['Quiet Night','A calm blue night'],ko:['고요한 밤','눈이 편안한 짙은 밤빛']},
 {id:'hellgate',icon:'♨',en:['Hellgate','Glowing embers in the dark'],ko:['지옥문','어둠 속에서 빛나는 불씨']},
 {id:'icekingdom',icon:'❄',en:['Ice Kingdom','Clear ice and winter skies'],ko:['얼음왕국','맑은 얼음과 겨울 하늘']},
 {id:'dreamforest',icon:'♧',en:['Dream Forest','Leaves and firefly light'],ko:['몽환의 숲','짙은 잎사귀와 반딧불의 빛']},
 {id:'sunkenpalace',icon:'≋',en:['Sunken Palace','Deep seas and faded gold'],ko:['침몰한 왕궁','깊은 바다와 오래된 금빛']},
 {id:'clockworkcity',icon:'⚙',en:['Forgotten Clockwork City','Brass, gears and lamplight'],ko:['잊혀진 태엽도시','황동 톱니와 포근한 등불']},
];
const copy={
 en:{open:'Theme',heading:'A mood for your notebook',help:'Choose a theme to preview it right away. Your choice stays on this device.',group:'Main theme',selected:'Selected',done:'Done',temporary:'The theme is applied for now, but this browser could not remember it.'},
 ko:{open:'테마',heading:'내 공책의 분위기',help:'마음에 드는 테마를 고르면 바로 바뀌어요. 이 기기에서 다음에도 기억할게요.',group:'메인 테마',selected:'선택 중',done:'완료',temporary:'테마는 적용했지만, 이 브라우저에서는 선택을 저장하지 못했어요.'},
};
export function createThemes(doc,preferences,getLanguage){
 const button=doc.querySelector('#open-theme'),dialog=doc.querySelector('#theme-dialog'),grid=doc.querySelector('#theme-options');
 let current='notebook',temporary=false;
 try{const saved=preferences?.getItem(THEME_KEY);if(themes.some(x=>x.id===saved))current=saved;}catch{/* Use the default when storage is unavailable. */}
 function apply(){doc.documentElement.dataset.theme=current;}
 for(const theme of themes){
  const label=doc.createElement('label');label.className='theme-option';label.dataset.palette=theme.id;
  const input=doc.createElement('input');input.type='radio';input.name='main-theme';input.value=theme.id;input.className='sr-only';
  const preview=doc.createElement('span');preview.className='theme-preview';preview.setAttribute('aria-hidden','true');
  const symbol=doc.createElement('span');symbol.className='theme-symbol';symbol.textContent=theme.icon;
  const window=doc.createElement('span');window.className='theme-mini-window';
  for(let i=0;i<3;i++)window.append(doc.createElement('i'));
  preview.append(symbol,window);
  const name=doc.createElement('strong'),description=doc.createElement('span'),selected=doc.createElement('span');
  name.className='theme-name';description.className='theme-description';selected.className='theme-selected';selected.setAttribute('aria-hidden','true');
  label.append(input,preview,name,description,selected);grid.append(label);
  input.addEventListener('change',()=>{
   if(!input.checked)return;
   current=theme.id;apply();temporary=false;
   try{if(!preferences)throw Error('No local preferences');preferences.setItem(THEME_KEY,current);}catch{temporary=true;}
   render();
  });
 }
 function render(){
  const lang=getLanguage()==='ko'?'ko':'en',text=copy[lang];
  button.textContent=`◐ ${text.open}`;
  doc.querySelector('#theme-heading').textContent=text.heading;
  doc.querySelector('#theme-help').textContent=text.help;
  grid.setAttribute('aria-label',text.group);
  doc.querySelector('#theme-done').textContent=text.done;
  const status=doc.querySelector('#theme-status');status.textContent=temporary?text.temporary:'';status.hidden=!temporary;
  for(const [i,label] of [...grid.children].entries()){
   const theme=themes[i],chosen=theme.id===current;
   label.querySelector('input').checked=chosen;
   label.querySelector('.theme-name').textContent=theme[lang][0];
   label.querySelector('.theme-description').textContent=theme[lang][1];
   label.querySelector('.theme-selected').textContent=chosen?`✓ ${text.selected}`:'';
  }
 }
 button.addEventListener('click',()=>{render();dialog.showModal();grid.querySelector('input:checked').focus();});
 doc.querySelector('#theme-done').addEventListener('click',()=>dialog.close());
 apply();render();
 return {render,clear(){try{preferences?.removeItem(THEME_KEY);}catch{}current='notebook';temporary=false;apply();render();}};
}
