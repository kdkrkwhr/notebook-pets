import {starter} from './model.mjs';
import {t} from './i18n.mjs';

export function battleFrames(result){
 const final={hp_me:result.hp_me,hp_enemy:result.hp_enemy};
 const turns=Array.isArray(result.turns)?result.turns.slice(0,20):[];
 return turns.length?turns:[final];
}
export function createBattle(document){
 const $=id=>document.querySelector(id),dialog=$('#battle-dialog');
 let timer=null,result=null,language='en';
 const stop=()=>{clearTimeout(timer);timer=null;$('#battle-own').classList.remove('strike');$('#battle-enemy').classList.remove('strike');};
 function hp(frame){$('#battle-own-hp').value=frame.hp_me;$('#battle-enemy-hp').value=frame.hp_enemy;$('#battle-hp-text').textContent=`${Math.ceil(frame.hp_me)} / ${result.max_hp_me} · ${Math.ceil(frame.hp_enemy)} / ${result.max_hp_enemy}`;}
 function finish(){stop();if(!result)return;hp(result);$('#battle-status').textContent=t(language,`battle_${result.outcome}`);$('#battle-skip').textContent=t(language,'close');}
 $('#battle-skip').addEventListener('click',()=>{if(timer)finish();else dialog.close();});
 dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
 return {
  close(){stop();dialog.close();result=null;},
  show(response,before,portrait,lang){
   stop();result=response;language=lang;
   if(!response.opponent||!['win','lose','draw'].includes(response.outcome))return;
   $('#battle-own').src=portrait||starter(before);$('#battle-own').alt=before.status.name;
   $('#battle-enemy').src=starter(response.opponent);$('#battle-enemy').alt=response.opponent.species;
   $('#battle-own-name').textContent=before.status.name;
   $('#battle-enemy-name').textContent=`${response.opponent.species} · ${response.opponent.element} · Lv.${response.opponent.level}`;
   $('#battle-own-hp').max=response.max_hp_me;$('#battle-enemy-hp').max=response.max_hp_enemy;
   hp({hp_me:response.max_hp_me,hp_enemy:response.max_hp_enemy});
   $('#battle-status').textContent=t(lang,'battlePlaying');$('#battle-skip').textContent=t(lang,'battleSkip');
   $('#battle-reward').textContent=`${response.msg} · +${response.xp_result?.gained||0} XP`;
   if(!dialog.open)dialog.showModal();
   if(document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
   const frames=battleFrames(response);let index=0;
   const interval=Math.min(420,3000/frames.length);
   function tick(){
    if(!dialog.open)return stop();
    if(index===frames.length)return finish();
    hp(frames[index++]);$('#battle-own').classList.toggle('strike');$('#battle-enemy').classList.toggle('strike');
    timer=setTimeout(tick,interval);
   }
   timer=setTimeout(tick,interval);
  }
 };
}
