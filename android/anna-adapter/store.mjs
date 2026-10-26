// Local Anna KV/files. Previous mobile rows survive the atomic copy migration.
export const GAME='notebuddy/game-v1';
const KEYS=new Set([GAME,'notebuddy/chat-v1','notebuddy/art-v1','notebuddy/walk-story-v1','notebuddy/personality-draft-v1']);
export function failure(code,message){return Object.assign(Error(message),{code});}
export function transaction(db,stores,mode,work){return new Promise((resolve,reject)=>{
 const tx=db.transaction(stores,mode);let result,error;
 tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Local storage transaction interrupted'));tx.onerror=()=>{};
 const done=value=>{result=value;},fail=e=>{error=e;tx.abort();};
 try{work(tx,done,fail);}catch(e){fail(e);}
});}
export async function openStore(name='notebuddy-android'){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,2);
  r.onupgradeneeded=()=>{for(const s of ['saves','anna-kv','anna-files','anna-meta'])if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s);};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close the previous app window and reopen. Original data is preserved.'));
 });
 db.onversionchange=()=>db.close();
 try{await transaction(db,['saves','anna-kv','anna-files','anna-meta'],'readwrite',(tx,done,fail)=>{
  const meta=tx.objectStore('anna-meta'),marker=meta.get('migration-6066cad');
  marker.onsuccess=()=>{if(marker.result)return;
   const old=tx.objectStore('saves'),player=old.get('player'),visuals=old.get('visuals'),draft=old.get('birth-draft');
   draft.onsuccess=()=>{try{
    const kv=tx.objectStore('anna-kv'),files=tx.objectStore('anna-files');
    if(player.result?.state)kv.put({value:player.result.state,etag:crypto.randomUUID()},GAME);
    const v=visuals.result;
    if(v){for(const [key,field] of [['notebuddy/art-v1','art'],['notebuddy/chat-v1','chat'],['notebuddy/walk-story-v1','story']])if(v[field]!=null)kv.put({value:v[field],etag:crypto.randomUUID()},key);
     for(const [path,blob] of Object.entries(v.files||{})){validateFile(path,blob);files.put({blob,etag:crypto.randomUUID()},path);}}
    meta.put({version:1,previousRevision:player.result?.revision??0,retainedDraft:!!draft.result},'migration-6066cad');
   }catch(e){fail(e);}};
  };
 });}catch(error){db.close();throw error;}return db;
}
export function get(db,key){if(!KEYS.has(key))throw Error('Unsupported local KV key');return transaction(db,['anna-kv'],'readonly',(tx,done)=>{const r=tx.objectStore('anna-kv').get(key);r.onsuccess=()=>done(r.result?{exists:true,...r.result}:{exists:false,value:null});});}
export function set(db,key,value,ifMatch){if(!KEYS.has(key))throw Error('Unsupported local KV key');return transaction(db,['anna-kv'],'readwrite',(tx,done,fail)=>{
 const store=tx.objectStore('anna-kv'),r=store.get(key);r.onsuccess=()=>{if((r.result?.etag??null)!==(ifMatch??null)){fail(failure(-32023,'Storage conflict'));return;}const etag=crypto.randomUUID();store.put({value,etag},key);done({etag});};
});}
export function validatePath(path){if(typeof path!=='string'||!/^portraits\/[a-zA-Z0-9/._-]+$/.test(path)||path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Invalid local portrait path');}
export function validateFile(path,blob){validatePath(path);if(!(blob instanceof Blob)||blob.size===0||blob.size>20_000_000||!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Invalid local image');}
export function fileRead(db,path){validatePath(path);return transaction(db,['anna-files'],'readonly',(tx,done)=>{const r=tx.objectStore('anna-files').get(path);r.onsuccess=()=>done(r.result);});}
export function fileWrite(db,path,blob){validateFile(path,blob);return transaction(db,['anna-files'],'readwrite',(tx,done)=>{const etag=crypto.randomUUID();tx.objectStore('anna-files').put({blob,etag},path);done({etag});});}
export function fileDelete(db,path,etag){validatePath(path);return transaction(db,['anna-files'],'readwrite',(tx,done,fail)=>{const s=tx.objectStore('anna-files'),r=s.get(path);r.onsuccess=()=>{if(!r.result){fail(failure(-32022,'Image not found'));return;}if(!etag||etag!==r.result.etag){fail(failure(-32023,'Image conflict'));return;}s.delete(path);done({});};});}
export function fileList(db,prefix,limit=100){if(prefix!=='portraits/')throw Error('Unsupported image prefix');return transaction(db,['anna-files'],'readonly',(tx,done)=>{const items=[],r=tx.objectStore('anna-files').openCursor();r.onsuccess=()=>{const c=r.result;if(!c){done({items});return;}if(items.length>=Math.min(100,limit)){done({items,next_cursor:String(c.key)});return;}items.push({path:c.key,etag:c.value.etag});c.continue();};});}
