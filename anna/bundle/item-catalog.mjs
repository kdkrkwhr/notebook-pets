import {localeText,localeObject} from './locale.mjs';
import {createActivity} from './activity.mjs';
import {equipmentWords,EQUIPMENT_ENABLED} from './equipment.mjs';
import {items,regions,slots,selectItems,fitRules} from './items.mjs';

export function createItemCatalog(document,language,h={}){
 const $=s=>document.querySelector(s),dialog=$('#item-catalog'),detail=$('#item-detail');
 let selected=null,owned={},discovered=[],working=false,preview=null,previewURL=null,originalURL=null,outcome=null,phaseKind=null,activeKey=null,operationItem=null,uiEpoch=0;
 const fitting=document.createElement('section');fitting.id='equipment-controls';$('#item-detail-description').after(fitting);
 const status=document.createElement('p');status.id='equipment-status';status.tabIndex=-1;status.setAttribute('role','status');status.setAttribute('aria-live','polite');fitting.append(status);
 const activity=createActivity(status,language),media=document.createElement('div'),actions=document.createElement('div');media.className='equipment-compare';actions.className='equipment-actions';fitting.append(media,actions);
 const background=document.createElement('aside'),backgroundText=document.createElement('p'),backgroundOpen=document.createElement('button');background.id='equipment-background-status';background.className='equipment-background';background.hidden=true;backgroundText.setAttribute('role','status');backgroundOpen.type='button';background.append(backgroundText,backgroundOpen);($('#action-result')||dialog).before(background);
 const viewer=document.createElement('dialog'),viewerTitle=document.createElement('h2'),viewerImage=document.createElement('img'),viewerClose=document.createElement('button');viewer.id='equipment-image-viewer';viewerTitle.id='equipment-image-title';viewer.setAttribute('aria-labelledby',viewerTitle.id);viewerClose.type='button';viewerClose.onclick=()=>viewer.close();viewer.append(viewerTitle,viewerClose,viewerImage);document.body.append(viewer);
 const enabled=()=>h.enabled??EQUIPMENT_ENABLED;
 const ew=k=>localeText(language(),equipmentWords[k][language()==='ko'?1:0]);
 const discoveryLabel=()=>localeText(language(),language()==='ko'?'발견 · 현재 미보유':'Discovered · not owned');
 const phaseFor=key=>({wear:'image',retry:'load',apply:'save',cancel:'load'}[key]||'load');
 function disposePreview(){if(viewer.open)viewer.close();for(const url of [previewURL,originalURL])if(url)URL.revokeObjectURL(url);preview=null;previewURL=originalURL=null;}
 async function receivePreview(value){
  disposePreview();preview=value;previewURL=URL.createObjectURL(value.blob);phaseKind='load';renderFitting();
  try{let blob;if(h.original)blob=await h.original(value.pending);else if(value.pending?.source_path?.startsWith('assets/')){const r=await fetch(value.pending.source_path);if(!r.ok)throw Error('Original unavailable');blob=await r.blob();}else throw Error('Original unavailable');const image=await createImageBitmap(blob);image.close();originalURL=URL.createObjectURL(blob);return true;}catch{return false;}
 }
 function showImage(url,label){viewerTitle.textContent=label;viewerImage.src=url;viewerImage.alt=label;viewerClose.textContent=text('close');viewer.showModal();}
 function comparison(url,label,kind){const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=label;if(url){const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.className='equipment-image-button';button.dataset.equipmentZoom=kind;button.setAttribute('aria-label',ew('zoom')+' '+label);image.src=url;image.alt=label;button.append(image);button.onclick=()=>showImage(url,label);figure.append(button);}else{const missing=document.createElement('p');missing.className='muted';missing.textContent=ew('originalMissing');figure.append(missing);}figure.append(caption);return figure;}
 function renderFitting(){
  const pending=h.pending?.(),target=items.find(i=>i.id===pending?.item_id)||operationItem||selected;
  detail.classList.toggle('has-fitting-preview',!!previewURL);fitting.dataset.state=working?'working':outcome||'idle';fitting.setAttribute('aria-busy',String(working));
  if(working)activity.set(phaseKind||phaseFor(activeKey));else{activity.clear();status.textContent=ew(enabled()?(outcome||'usage'):'unavailable');}
  media.replaceChildren();if(previewURL){media.append(comparison(originalURL,ew('original'),'original'),comparison(previewURL,ew(outcome==='applied'?'savedResult':'result'),'result'));}
  actions.replaceChildren();
  if(pending||working||previewURL){const label=document.createElement('p');label.className='equipment-item-label';if(target){const icon=document.createElement('img');icon.src=target.icon;icon.alt='';icon.width=40;icon.height=40;label.append(icon,document.createTextNode(ew('target')+local(target.name)));}actions.append(label);}
  const keys=pending?['apply','retry','cancel']:['wear'];
  for(const key of keys){const button=document.createElement('button');button.type='button';button.dataset.equipment=key;button.textContent=ew(key);button.className=key==='wear'||key==='apply'?'primary':key==='cancel'?'quiet':'';button.disabled=!enabled()||working||(key==='wear'&&(!selected||owned[selected.id]!==1))||(key==='apply'&&(!preview||!originalURL));button.onclick=()=>perform(key);actions.append(button);}
  document.querySelectorAll('#item-grid .item-card').forEach(button=>{button.disabled=working;});
  if(dialog.open)dialog.querySelector('.item-book-header').after(background);else ($('#action-result')||dialog).before(background);
  background.hidden=detail.open||(!working&&!outcome&&!pending);backgroundText.textContent=working?ew('background'):ew(outcome||'resume');backgroundOpen.textContent=ew('openFitting');$('#close-item-detail').title=working?ew('background'):text('close');
 }
 async function perform(key){
  if(working||!enabled())return;const epoch=++uiEpoch;working=true;activeKey=key;operationItem=items.find(i=>i.id===h.pending?.()?.item_id)||selected;outcome=null;phaseKind=phaseFor(key);renderFitting();status.focus({preventScroll:true});
  try{const value=await (key==='wear'?h.start(selected):key==='retry'?h.recover():key==='apply'?h.apply(preview?.pending):h.cancel());if(epoch!==uiEpoch)return;
   if(value?.blob)outcome=await receivePreview(value)?'previewReady':'originalMissing';else if(key==='apply'&&value?.ok)outcome='applied';else if(key==='cancel'&&value?.ok){disposePreview();outcome='cancelled';}else{disposePreview();outcome=key==='retry'?'recovered':'notPending';}
  }catch{if(epoch===uiEpoch)outcome='uncertain';}
  finally{if(epoch===uiEpoch){working=false;phaseKind=null;activeKey=null;renderFitting();const next=preview&&h.pending?.()?actions.querySelector('[data-equipment=apply]'):status;(next&&!next.disabled?next:status).focus({preventScroll:true});}}
 }
 function selectItem(item){if(working)return;const pending=h.pending?.(),target=items.find(i=>i.id===pending?.item_id)||item;if(selected?.id!==target.id){disposePreview();outcome=null;}selected=target;renderDetail();if(!detail.open)detail.showModal();renderFitting();if(pending&&!preview)perform('retry');}
 detail.addEventListener('close',()=>{renderFitting();if(dialog.open&&!background.hidden)dialog.scrollTop=0;});
 backgroundOpen.onclick=()=>{open();if(working){if(!detail.open)detail.showModal();renderFitting();status.focus({preventScroll:true});return;}if(selected||h.pending?.())selectItem(items.find(i=>i.id===h.pending?.()?.item_id)||selected);};
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
 const fittingCopy={"notice": ["Each final guardian clear grants one unowned regional item. Wear an owned item to preview a new portrait; applying it consumes one item. Common gifts and the item shop are not available yet.", "마지막 수호자를 클리어하면 해당 지역의 미보유 아이템을 하나 받아요. 보유 아이템을 착용해 새 초상화를 미리 보고, 적용하면 아이템 하나가 소모돼요. 기본 선물과 아이템 상점은 아직 준비 중이에요."], "rule": ["Collecting and wearing are separate. Even a companion without hands can collect gloves. Choose a cosmetic that suits your companion. Wearing interprets the item rather than copying its catalog art exactly. Check identity and anatomy in the preview before applying. Missing limbs must never be added.", "수집과 착용은 별개예요. 손이 없는 친구도 수집할 수 있어요. 친구의 체형에 맞는 장식을 골라 주세요. 착용은 도감 그림을 그대로 복사하지 않고 아이템을 해석해 그려요. 적용 전 미리보기에서 친구의 모습과 신체를 확인해 주세요. 없는 팔다리를 추가하면 안 돼요."]};
 const text=key=>localeText(language(),((enabled()&&fittingCopy[key])||words[key])[language()==='ko'?1:0]);
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
  $('#item-detail-owned').textContent=owned[selected.id]===1?text('owned'):discovered.includes(selected.id)?discoveryLabel():text('missing');
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
   const badge=document.createElement('span');badge.className='badge item-ownership';badge.textContent=owned[item.id]===1?text('owned'):discovered.includes(item.id)?discoveryLabel():text('missing');button.dataset.owned=String(owned[item.id]===1);
   button.append(art,name,meta,badge);button.onclick=()=>selectItem(item);return button;
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
 function open(name='items'){render();tab(name);if(!dialog.open)dialog.showModal();renderFitting();}
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
 dialog.addEventListener('close',()=>{if(detail.open)detail.close();renderFitting();});
 return {render,open,phase:value=>{phaseKind=value;if(working)renderFitting();},update(value,history=[]){owned=value||{};discovered=history;renderList();renderDetail();},clear(){uiEpoch++;working=false;owned={};discovered=[];selected=operationItem=null;outcome=null;disposePreview();activity.clear();background.hidden=true;if(detail.open)detail.close();if(dialog.open)dialog.close();renderList();$('#item-detail-owned').textContent='';}};
}
