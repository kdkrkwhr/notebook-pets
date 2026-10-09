import {mergeHistory} from './model.mjs';
import {t,chatPrompt} from './i18n.mjs';

export const reactionActions=new Set(['feed','snack','play','train','walk','sleep','attendance','claimquest','battle','flee']);
export const REACTION_PREFERENCE='notebuddy/action-reactions-v1';
export function reactionPrompt(language,view,command){
 return `${chatPrompt(language,view.status)} React to this already-completed game event in ONE short playful sentence, at most 160 characters. Do not claim any extra rewards or actions. Event data: ${JSON.stringify({action:command,result:view.msg,xp:view.xp_result?.gained,outcome:view.outcome})}`;
}

// Replayed server receipts never request AI. UI refresh never calls handle().
// The fallback is saved first; storage retry only saves the existing reply.
export function createReactions({getHistory,setHistory,save,generate,enabled,isCurrent,changed}){
 let epoch=0,running=null,tail=Promise.resolve();
 const seen=new Set(),pending=new Map();
 const current=(pet,stamp)=>stamp===epoch&&isCurrent(pet);
 function show(){changed(pending.size);}
 async function flush(id,item,stamp){
  const work=async()=>{
   if(!current(item.pet,stamp))return;
   try{
    const saved=await save(item.pet,item.entries);
    if(!current(item.pet,stamp))return;
    setHistory(mergeHistory(saved,getHistory()));
    if(pending.get(id)===item)pending.delete(id);
   }catch{/* Saved gameplay is never rolled back for an optional reaction. */}
   if(current(item.pet,stamp))show();
  };
  tail=tail.catch(()=>{}).then(work);await tail;
 }
 return {
  async handle(view,command,requestId,language){
   if(!view.ok||!view.status||!reactionActions.has(command)||!requestId)return;
   const pet=view.pet_id,stamp=epoch,id=`reaction:${pet}:${requestId}`;
   if(!current(pet,stamp)||seen.has(id)||getHistory().some(x=>x.id===id))return;
   seen.add(id);if(seen.size>128)seen.delete(seen.values().next().value);
   const at=Date.now();
   const entries=[{id:`activity:${pet}:${requestId}`,role:'assistant',kind:'activity',text:view.msg,at},
    {id,role:'assistant',kind:'reaction',source:'basic',text:t(language,`react_${command}`),at:at+1}];
   const item={pet,entries};pending.set(id,item);setHistory(mergeHistory(getHistory(),entries));show();
   // Claim the local AI slot before awaiting storage, so bursts cannot queue paid calls.
   const token=enabled()&&!view.replayed&&!running?Symbol():null;
   if(token)running=token;
   try{
    await flush(id,item,stamp);
    if(!token||!current(pet,stamp)||!enabled())return;
    const response=await generate(reactionPrompt(language,view,command));
    if(!current(pet,stamp))return;
    const text=response?.content?.text?.trim();if(!text)return;
    const reply={...entries[1],source:'ai',text:text.slice(0,240)};
    const updated={pet,entries:[entries[0],reply]};pending.set(id,updated);
    setHistory(mergeHistory(getHistory(),updated.entries));show();await flush(id,updated,stamp);
   }catch{/* The labelled basic response is already visible; never regenerate automatically. */}
   finally{if(running===token)running=null;}
  },
  restore(items){return mergeHistory(items,[...pending.values()].flatMap(x=>x.entries));},
  async retry(){const stamp=epoch;for(const [id,item] of [...pending])await flush(id,item,stamp);},
  clear(){epoch++;running=null;pending.clear();seen.clear();show();},
  get pending(){return pending.size;}
 };
}
