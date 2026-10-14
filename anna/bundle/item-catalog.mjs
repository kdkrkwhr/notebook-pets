import {items,regions,slots,selectItems,fitRules} from './items.mjs';

export function createItemCatalog(document,language){
 const $=s=>document.querySelector(s),dialog=$('#item-catalog'),detail=$('#item-detail');
 let selected=null;
 const words={
  heading:['Explorer’s item book','탐험가의 아이템 도감'],open:['Browse items','아이템 둘러보기'],
  intro:['Little treasures from familiar paths and distant dungeons.','익숙한 산책길과 신비로운 던전에서 만날 작은 보물들.'],
  preview:['Collection preview','도감 미리보기'],notice:['Explore the designs and planned rewards. Collecting, buying and equipping will open in a later update.','아이템 모습과 예정된 획득 방법을 먼저 살펴보세요. 수집·구매·착용은 다음 업데이트에서 열려요.'],
  allRegions:['All regions','모든 지역'],allSlots:['All types','모든 부위'],region:['Region','지역'],slot:['Type','부위'],
  common:['Everyday adventures','공용'],hellgate:['Hellgate','지옥문'],icekingdom:['Ice Kingdom','얼음왕국'],dreamforest:['Dream Forest','몽환의 숲'],
  head:['Head','머리'],neck:['Neck ornament','목 장식'],back:['Back ornament','등 장식'],aura:['Surrounding effect','주변 효과'],
  standard:['Standard','일반'],rare:['Rare','희귀'],search:['Find an item','아이템 검색'],empty:['No items match. Try another name or filter.','맞는 아이템이 없어요. 이름이나 필터를 바꿔 보세요.'],
  clear:['Clear filters','필터 초기화'],close:['Close','닫기'],count:['items','종'],
  acquisition:['Planned way to collect','획득 방법 · 예정'],gift:['A welcome gift when item collecting opens.','아이템 수집 기능이 열리면 첫 선물로 받을 예정이에요.'],coins:['Buy with saved coins. The price is not set yet.','모아 둔 코인으로 구매할 예정이에요. 가격은 아직 정해지지 않았어요.'],
  regional:['Clear this dungeon to unlock a future coin purchase.','이 던전을 클리어하면 코인으로 구매할 수 있도록 열릴 예정이에요.'],milestone:['A reward for repeated clears of this dungeon. The required count is not set yet.','이 던전을 여러 번 클리어한 보상으로 받을 예정이에요. 필요한 횟수는 아직 정해지지 않았어요.'],
  fit:['How it fits','착용 부위 기준'],cosmetic:['Appearance only · No combat bonuses','외형 꾸미기 전용 · 전투 능력치 없음'],
  ruleHeading:['Every companion has its own shape','친구마다 몸의 형태가 달라요'],
  rule:['Collecting and wearing are separate. Gloves need visible hands; a handless companion can collect them but cannot wear them. An area that is hidden or unclear needs confirmation. Items never add missing limbs. Individual body analysis and equipment are not available yet.','수집과 착용은 별개예요. 장갑은 손이 보이는 친구가 착용할 수 있고, 손이 없는 친구도 수집은 할 수 있어요. 가려지거나 불분명한 부위는 확인이 필요해요. 아이템을 위해 없던 팔다리를 만들지 않아요. 현재는 개별 외형 분석과 착용을 제공하지 않아요.'],
 };
 const text=key=>words[key][language()==='ko'?1:0];
 const local=pair=>pair[language()==='ko'?1:0];
 function options(id,values,all){
  const element=$(id),value=element.value||'all';element.replaceChildren();
  for(const key of ['all',...values]){const option=document.createElement('option');option.value=key;option.textContent=text(key==='all'?all:key);element.append(option);}element.value=value;
 }
 function renderDetail(){
  if(!selected)return;
  $('#item-detail-name').textContent=local(selected.name);$('#item-detail-image').src=selected.icon;$('#item-detail-image').alt=local(selected.name);
  $('#item-detail-description').textContent=local(selected.description);
  $('#item-detail-meta').textContent=[text(selected.region),text(selected.slot),text(selected.rarity)].join(' · ');
  $('#item-detail-reward').textContent=text(selected.reward);$('#item-detail-fit').textContent=local(fitRules[selected.slot]);
 }
 function renderList(){
  const matches=selectItems({region:$('#item-region').value,slot:$('#item-slot').value,query:$('#item-search').value,language:language()});
  $('#item-count').textContent=language()==='ko'?`${matches.length} / ${items.length}종`:`${matches.length} of ${items.length} items`;
  $('#item-empty').hidden=!!matches.length;
  const cards=matches.map(item=>{
   const button=document.createElement('button');button.type='button';button.className='item-card';button.dataset.item=item.id;button.dataset.rarity=item.rarity;
   const art=document.createElement('span');art.className='item-card-art';art.dataset.region=item.region;
   const img=document.createElement('img');img.src=item.icon;img.alt='';img.loading='lazy';img.width=128;img.height=128;art.append(img);
   const name=document.createElement('strong');name.textContent=local(item.name);
   const meta=document.createElement('span');meta.className='item-card-meta';meta.textContent=`${text(item.slot)} · ${text(item.rarity)}`;
   button.append(art,name,meta);button.onclick=()=>{selected=item;renderDetail();detail.showModal();};return button;
  });$('#item-grid').replaceChildren(...cards);
 }
 function render(){
  for(const node of document.querySelectorAll('[data-item-text]'))node.textContent=text(node.dataset.itemText);
  $('#item-search').placeholder=text('search');
  options('#item-region',regions,'allRegions');options('#item-slot',slots,'allSlots');renderList();renderDetail();
 }
 const tabs={items:['#collection-tab-items','#item-book-panel'],album:['#collection-tab-album','#collection-album-panel']};
 function tab(name){
  for(const [key,[button,panel]] of Object.entries(tabs)){const active=key===name;$(button).setAttribute('aria-selected',String(active));$(button).tabIndex=active?0:-1;$(panel).hidden=!active;}
  $('#collection-album-empty').hidden=!!$('#collection-album').children.length;
 }
 function open(name='items'){render();tab(name);if(!dialog.open)dialog.showModal();}
 $('#collection-tab-items').onclick=()=>tab('items');$('#collection-tab-album').onclick=()=>tab('album');
 $('.collection-tabs').addEventListener('keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  const next=$('#collection-tab-items').getAttribute('aria-selected')==='true'?'album':'items';
  tab(next);$(tabs[next][0]).focus();event.preventDefault();
 });
 $('#open-items').onclick=()=>open();
 $('#close-items').onclick=()=>dialog.close();$('#close-item-detail').onclick=()=>detail.close();
 $('#item-region').onchange=renderList;$('#item-slot').onchange=renderList;$('#item-search').oninput=renderList;
 $('#item-clear').onclick=()=>{$('#item-region').value='all';$('#item-slot').value='all';$('#item-search').value='';renderList();};
 dialog.addEventListener('close',()=>{if(detail.open)detail.close();});
 return {render,open};
}
