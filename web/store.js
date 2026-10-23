export function openStore(name='notebuddy-web') {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('saves');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export function load(db) {
  return new Promise((resolve,reject)=>{
    const request=db.transaction('saves').objectStore('saves').get('player');
    request.onsuccess=()=>resolve(request.result??{revision:0,state:null});
    request.onerror=()=>reject(request.error);
  });
}
// Game and art share one transaction when replacing/resetting a notebook.
// The epoch also invalidates late image responses, including same-pet imports.
export function commit(db,revision,state,visuals,replace=false) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite'), store=tx.objectStore('saves');
    let conflict=false;
    const request=store.get('player');
    request.onsuccess=()=>{
      if((request.result?.revision??0)!==revision){conflict=true;tx.abort();return;}
      const old=request.result,changed=replace||old?.state?.pet_id!==state?.pet_id;
      const epoch=(old?.epoch??0)+(changed?1:0);
      store.put({revision:revision+1,epoch,state},'player');
      if(changed)store.put(visuals??{revision:0,art:{},files:{}},'visuals');
    };
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(new Error(conflict?'다른 창에서 저장이 변경되었습니다. 다시 시도해 주세요.':'저장에 실패했습니다.'));
    tx.onerror=()=>{};
  });
}

export function snapshot(db){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('saves'),store=tx.objectStore('saves');
    const player=store.get('player'),visuals=store.get('visuals');
    tx.oncomplete=()=>resolve({player:player.result??{revision:0,epoch:0,state:null},visuals:visuals.result??{revision:0,art:{},files:{}}});
    tx.onabort=()=>reject(tx.error??Error('공책을 읽지 못했어요.'));
  });
}
export function updateVisuals(db,epoch,petId,change){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');let error,result;
    const player=store.get('player'),visuals=store.get('visuals');
    visuals.onsuccess=()=>{
      try{
        if((player.result?.epoch??0)!==epoch||player.result?.state?.pet_id!==petId)throw Error('Companion changed');
        const current=visuals.result??{revision:0,art:{},files:{}};
        result=change(current,player.result.state);result.revision=current.revision+1;store.put(result,'visuals');
      }catch(e){error=e;tx.abort();}
    };
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(error??tx.error??Error('그림을 저장하지 못했어요.'));
    tx.onerror=()=>{};
  });
}
