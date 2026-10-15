export function openStore() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('notebuddy-web',1);
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
export function commit(db,revision,state) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite'), store=tx.objectStore('saves');
    let conflict=false;
    const request=store.get('player');
    request.onsuccess=()=>{
      if((request.result?.revision??0)!==revision){conflict=true;tx.abort();return;}
      store.put({revision:revision+1,state},'player');
    };
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(new Error(conflict?'다른 창에서 저장이 변경되었습니다. 다시 시도해 주세요.':'저장에 실패했습니다.'));
    tx.onerror=()=>{};
  });
}
