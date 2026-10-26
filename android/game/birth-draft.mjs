import {openStore} from './store.js';
// Same transaction store as the notebook; final commit removes the draft atomically.
export async function openBirthDraft(name){
  const db=await openStore(name);let epoch=null;
  async function access(write,value){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('saves',write?'readwrite':'readonly'),store=tx.objectStore('saves');let result,error;
      const player=store.get('player'),draft=store.get('birth-draft');
      draft.onsuccess=()=>{
        try{
        const p=player.result??{revision:0,epoch:0,state:null};
        if(epoch===null)epoch=p.epoch??0;
        if(p.state||(p.epoch??0)!==epoch){if(write){error=Error('공책이 바뀌었어요. 새로 열어 확인해 주세요.');tx.abort();}else result=null;return;}
        result=draft.result??null;if(write){if(value===null)store.delete('birth-draft');else store.put(value,'birth-draft');}
        }catch(e){error=e;try{tx.abort();}catch{/* Already aborted. */}}
      };
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error??tx.error??Error('준비 중인 그림을 저장하지 못했어요.'));
      tx.onerror=()=>{};
    });
  }
  return {load:()=>access(false),rebase:()=>{epoch=null;return access(false);},save:value=>access(true,value),close:()=>db.close()};
}
