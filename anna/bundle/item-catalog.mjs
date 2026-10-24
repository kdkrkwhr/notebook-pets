import {localeText,localeObject} from './locale.mjs';
import {equipmentWords,EQUIPMENT_ENABLED} from './equipment.mjs';
import {items,regions,slots,selectItems,fitRules} from './items.mjs';

export function createItemCatalog(document,language,h={}){
 const $=s=>document.querySelector(s),dialog=$('#item-catalog'),detail=$('#item-detail');
 let selected=null,owned={},discovered=[],working=false,preview=null,previewURL=null;
 const fitting=document.createElement('section');fitting.id='equipment-controls';detail.append(fitting);
 const enabled=()=>h.enabled??EQUIPMENT_ENABLED;
 const ew=k=>equipmentWords[k][language()==='ko'?1:0];
 function renderFitting(){
  fitting.replaceChildren();
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent=ew(enabled()?'usage':'unavailable');fitting.append(status);
  if(previewURL){const img=document.createElement('img');img.src=previewURL;img.alt=language()==='ko'?'착용 결과 미리보기':'Fitting preview';img.width=256;fitting.append(img);}
  const pending=h.pending?.();
  const pendingItem=items.find(i=>i.id===pending?.item_id);
  if(pendingItem){const label=document.createElement('p');label.textContent=(language()==='ko'?'진행 중인 아이템: ':'Pending item: ')+local(pendingItem.name);fitting.append(label);}
  for(const [key,action] of [['wear',()=>h.start(selected)],['retry',()=>h.recover()],['apply',()=>h.apply(preview?.pending)],['cancel',()=>h.cancel()]]){
   if(key!=='wear'&&!pending)continue;
   const button=document.createElement('button');button.type='button';button.dataset.equipment=key;button.textContent=ew(key);button.disabled=!enabled()||working||(key==='wear'&&(!selected||owned[selected.id]!==1||!!pending))||(key==='apply'&&!preview);
   button.onclick=async()=>{if(working)return;working=true;renderFitting();try{const value=await action();preview=value?.blob?value:null;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=preview?URL.createObjectURL(preview.blob):null;working=false;renderFitting();}catch{working=false;renderFitting();fitting.querySelector('[role=status]').textContent=ew('uncertain');}};fitting.append(button);
  }
 }
 detail.addEventListener('cancel',e=>{if(working)e.preventDefault();});
 const words={
  heading:['Explorer’s item book','탐험가의 아이템 도감'],open:['Browse items','아이템 둘러보기'],
  intro:['Twenty-four little treasures from familiar paths and five distant dungeons.','익숙한 산책길과 다섯 던전에서 만날 24종의 작은 보물들.'],
  preview:['Item collection','아이템 수집'],notice:['Each final guardian clear grants one unowned regional item: three standard treasures, then the rare reward. Collected items stay in your inventory. Common items, shops and equipment are coming later.','마지막 수호자를 클리어할 때마다 그 지역의 미보유 아이템을 하나 받아요. 일반 3종 다음에는 희귀 보상을 받아요. 모은 아이템은 보관함에 남아요. 공용 아이템·상점·착용은 추후 제공해요.'],
  inventory:['My inventory','내 보관함'],ownership:['Collection','보유 상태'],allOwned:['All items','전체 아이템'],owned:['Owned','보유'],missing:['Not collected','미보유'],
  allRegions:['All regions','모든 지역'],allSlots:['All types','모든 부위'],region:['Region','지역'],slot:['Type','부위'],
  common:['Everyday adventures','공용'],hellgate:['Hellgate','지옥문'],icekingdom:['Ice Kingdom','얼음왕국'],dreamforest:['Dream Forest','몽환의 숲'],
  sunkenpalace:['Sunken Palace','침몰한 왕궁'],clockworkcity:['Forgotten Clockwork City','잊혀진 태엽도시'],
  head:['Head','머리'],neck:['Neck ornament','목 장식'],back:['Back ornament','등 장식'],aura:['Surrounding effect','주변 효과'],
  standard:['Standard','일반'],rare:['Rare','희귀'],search:['Find an item','아이템 검색'],empty:['No items match. Try another name or filter.','맞는 아이템이 없어요. 이름이나 필터를 바꿔 보세요.'],
  clear:['Clear filters','필터 초기화'],close:['Close','닫기'],count:['items','종'],
  acquisition:['How to collect','획득 방법'],gift:['A future welcome gift. Not available yet.','추후 첫 선물로 제공할 예정이에요. 지금은 획득할 수 없어요.'],coins:['A future coin shop item. Not available yet.','추후 코인 상점에서 제공할 예정이에요. 지금은 획득할 수 없어요.'],
  regional:['Clear this region’s final guardian to receive one unowned standard item. No duplicates.','이 지역의 마지막 수호자를 클리어하면 미보유 일반 아이템을 하나 받아요. 중복 지급은 없어요.'],milestone:['Clear this region again after collecting its three standard items to receive this rare reward.','이 지역의 일반 아이템 3종을 모은 뒤 한 번 더 클리어하면 받는 희귀 보상이에요.'],
  fit:['How it fits','착용 부위 기준'],cosmetic:['Appearance only · No combat bonuses','외형 꾸미기 전용 · 전투 능력치 없음'],
  ruleHeading:['Every companion has its own shape','친구마다 몸의 형태가 달라요'],
  rule:['Collecting and wearing are separate. Gloves need visible hands; a handless companion can collect them but cannot wear them. An area that is hidden or unclear needs confirmation. Items never add missing limbs. Individual body analysis and equipment are not available yet.','수집과 착용은 별개예요. 장갑은 손이 보이는 친구가 착용할 수 있고, 손이 없는 친구도 수집은 할 수 있어요. 가려지거나 불분명한 부위는 확인이 필요해요. 아이템을 위해 없던 팔다리를 만들지 않아요. 현재는 개별 외형 분석과 착용을 제공하지 않아요.'],
 };
 const text=key=>localeText(language(),words[key][language()==='ko'?1:0]);
 const local=pair=>localeText(language(),pair[language()==='ko'?1:0]);
 function options(id,values,all){
  const element=$(id),value=element.value||'all';element.replaceChildren();
  for(const key of ['all',...values]){const option=document.createElement('option');option.value=key;option.textContent=text(key==='all'?all:key);element.append(option);}element.value=value;
 }
 function renderDetail(){
  if(!selected)return;
  renderFitting();
  $('#item-detail-name').textContent=local(selected.name);$('#item-detail-image').src=selected.icon;$('#item-detail-image').alt=local(selected.name);
  $('#item-detail-description').textContent=local(selected.description);
  $('#item-detail-meta').textContent=[text(selected.region),text(selected.slot),text(selected.rarity)].join(' · ');
  $('#item-detail-reward').textContent=text(selected.reward);$('#item-detail-fit').textContent=local(fitRules[selected.slot]);
  $('#item-detail-owned').textContent=owned[selected.id]===1?text('owned'):discovered.includes(selected.id)?(language()==='ko'?'발견 · 현재 미보유':'Discovered · not owned'):text('missing');
 }
 function renderList(){
  const filter=$('#item-owned').value;
  const matches=selectItems({region:$('#item-region').value,slot:$('#item-slot').value,query:$('#item-search').value,language:language()}).filter(i=>filter==='all'||(owned[i.id]===1)===(filter==='owned'));
  const total=items.filter(i=>owned[i.id]===1).length;
  $('#item-count').textContent=localeText(language(),language()==='ko'?`${matches.length} / ${items.length}종 · 보유 ${total}종`:`${matches.length} of ${items.length} items · ${total} owned`);
  $('#item-empty').hidden=!!matches.length;
  const cards=matches.map(item=>{
   const button=document.createElement('button');button.type='button';button.className='item-card';button.dataset.item=item.id;button.dataset.rarity=item.rarity;
   const art=document.createElement('span');art.className='item-card-art';art.dataset.region=item.region;
   const img=document.createElement('img');img.src=item.icon;img.alt='';img.loading='lazy';img.width=128;img.height=128;art.append(img);
   const name=document.createElement('strong');name.textContent=local(item.name);
   const meta=document.createElement('span');meta.className='item-card-meta';meta.textContent=`${text(item.slot)} · ${text(item.rarity)}`;
   const badge=document.createElement('span');badge.className='badge item-ownership';badge.textContent=owned[item.id]===1?text('owned'):discovered.includes(item.id)?(language()==='ko'?'발견 · 현재 미보유':'Discovered · not owned'):text('missing');button.dataset.owned=String(owned[item.id]===1);
   button.append(art,name,meta,badge);button.onclick=()=>{selected=item;preview=null;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;renderDetail();detail.showModal();};return button;
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
 $('#open-inventory').onclick=()=>{$('#item-region').value='all';$('#item-slot').value='all';$('#item-search').value='';$('#item-owned').value='owned';open();};
 $('#close-items').onclick=()=>dialog.close();$('#close-item-detail').onclick=()=>detail.close();
 $('#item-region').onchange=renderList;$('#item-slot').onchange=renderList;$('#item-search').oninput=renderList;
 $('#item-owned').onchange=renderList;
 $('#item-clear').onclick=()=>{$('#item-region').value='all';$('#item-slot').value='all';$('#item-owned').value='all';$('#item-search').value='';renderList();};
 dialog.addEventListener('close',()=>{if(detail.open)detail.close();});
 return {render,open,update(value,history=[]){owned=value||{};discovered=history;renderList();renderDetail();},clear(){owned={};discovered=[];selected=null;preview=null;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;if(detail.open)detail.close();if(dialog.open)dialog.close();renderList();$('#item-detail-owned').textContent='';}};
}
