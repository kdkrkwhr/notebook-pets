import {rpc} from './desktop-runtime.mjs';
import {ART,erased} from './data.mjs';
import {unwrap} from './model.mjs';
import {pixelSource} from './pixel-pet.mjs';
import {currentHomeAppearance,readHomeAppearance} from './home-sprite.mjs';

const copy={
 en:['Call outside','Bring inside','Preparing…','Your friend is exploring your desktop. Drag to move; right-click or double-click to bring them back.','Create a friend first.','Open the installed NoteBuddy app to call your friend outside.','Could not bring your friend outside. Please try again.','Bring inside to show the portrait again.'],
 ko:['밖으로 부르기','안으로 부르기','준비 중…','친구가 바탕화면을 산책해요. 드래그로 옮기고, 오른쪽 클릭이나 더블클릭으로 돌아오게 할 수 있어요.','먼저 친구를 만들어 주세요.','설치된 노트버디 앱에서 친구를 밖으로 부를 수 있어요.','친구를 밖으로 부르지 못했어요. 다시 시도해 주세요.','안으로 부르면 사진이 다시 보여요.'],
 ja:['外に呼ぶ','中に戻す','準備中…','友達がデスクトップを散歩中。ドラッグで移動、右クリックかダブルクリックで戻ります。','先に友達を作ってください。','インストールした NoteBuddy アプリで使えます。','呼び出せませんでした。もう一度お試しください。','中に戻すと写真が再表示されます。'],
 'zh-Hans':['叫到桌面','叫回窗口','准备中…','伙伴正在桌面散步。拖动可移动，右键或双击可叫回。','请先创建伙伴。','请在已安装的 NoteBuddy 中使用。','无法叫出伙伴，请重试。','叫回窗口后会恢复照片。'],
 'zh-Hant':['叫到桌面','叫回視窗','準備中…','夥伴正在桌面散步。拖曳可移動，右鍵或雙擊可叫回。','請先建立夥伴。','請在已安裝的 NoteBuddy 中使用。','無法叫出夥伴，請重試。','叫回視窗後會恢復照片。']
};
const words=()=>copy[document.documentElement.lang]||copy.en;
const button=document.createElement('button');button.id='desktop-pet';button.type='button';button.className='quiet';
const hint=document.createElement('p');hint.id='desktop-pet-status';hint.role='status';hint.hidden=true;
document.querySelector('#desktop-settings').after(button);
document.querySelector('.pet-card').append(hint);
let outside=false,working=false,checking=false,timer,generation=0;
function paint(){button.textContent=words()[working?2:outside?1:0];button.disabled=working;button.setAttribute('aria-pressed',String(outside));button.title=outside?words()[7]:words()[0];document.body.classList.toggle('desktop-pet-outside',outside);if(outside){hint.hidden=false;hint.textContent=words()[3];}}
function state(result){const previous=outside;outside=!!result?.active;if(!outside&&previous){hint.hidden=true;hint.textContent='';}paint();}
new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
new MutationObserver(()=>{if(button.disabled!==working)button.disabled=working;}).observe(button,{attributes:true,attributeFilter:['disabled']});
paint();

async function prepare(){
 const view=unwrap(await rpc('tools.invoke',{method:'game',args:{command:'status'}}));
 if(!view.status||view.reset_pending)throw Error(words()[4]);
 const art=(await rpc('storage.get',{key:ART})).value||{};
 if(erased(art))throw Error(words()[4]);
 const appearance=currentHomeAppearance(view,art),source=pixelSource(view,art),path=appearance?.path||source;
 const url=path.startsWith('portraits/')?(await rpc('files.download_url',{path})).get_url:path;
 const response=await fetch(url);if(!response.ok)throw Error(words()[6]);
 const sheet=await readHomeAppearance(await response.blob(),appearance?.format==='home-sprite-v1'?'sprite':'default');
 // Fit every pose onto the same transparent canvas. Never invent missing poses.
 const maxWidth=Math.max(...sheet.frames.map(box=>box[2]));
 const scale=Math.min(112/sheet.maxHeight,136/maxWidth);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
 const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
 const frames=sheet.frames.map(box=>{
   context.clearRect(0,0,160,160);
   const width=Math.max(1,Math.round(box[2]*scale)),height=Math.max(1,Math.round(box[3]*scale));
   context.drawImage(sheet.canvas,...box,Math.round((160-width)/2),144-height,width,height);
   return canvas.toDataURL('image/png');
 });
 return {identity:[view.pet_id,view.stage,source,appearance?.path||''],frames};
}
button.onclick=async()=>{
 if(working)return;
 generation++;
 working=true;paint();
 try{
   const native=window.pywebview?.api;
   if(!native?.pet_summon)throw Error(words()[5]);
   state(outside?await native.pet_recall():await native.pet_summon(await prepare()));
 }catch(error){
   // Only hide the portrait after a native surface confirms it is visible.
   hint.hidden=false;hint.textContent=error?.message||words()[6];
 }finally{working=false;paint();}
};
async function check(){
 if(checking||working||!window.pywebview?.api?.pet_status)return;
 checking=true;const started=generation;
 try{const result=await window.pywebview.api.pet_status();if(started===generation&&!working)state(result);}catch{if(started===generation&&!working)state({active:false});}
 finally{checking=false;}
}
timer=setInterval(check,750);
window.addEventListener('pywebviewready',check);
window.addEventListener('pagehide',()=>clearInterval(timer));
check();
