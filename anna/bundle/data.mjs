// Only this app's records and portraits are in scope. Never delete a bucket.
export const CHAT='notebuddy/chat-v1', ART='notebuddy/art-v1';
export const TOMBSTONE=Object.freeze({_notebuddy_erased:1});
export const erased=value=>value?._notebuddy_erased===1;
export class ErasedError extends Error{constructor(){super('Notebuddy data removed');this.name='ErasedError';}}
const code=e=>Number(e?.details?.jsonrpc_code??e?.code);
const conflict=e=>code(e)===-32023||/precondition|conflict/i.test(String(e?.message));
const missing=e=>code(e)===-32022||e?.code==='not_found';
export async function mergeSaved(storage,key,merge){
  if(![CHAT,ART].includes(key))throw new Error('Unsupported data key');
  for(let attempt=0;attempt<3;attempt++){
    const current=await storage.get({key});
    if(erased(current.value))throw new ErasedError();
    if(current.exists&&!current.etag)throw new Error('Conditional writes required');
    try{const value=merge(current.value);await storage.set({key,value,...(current.etag?{if_match:current.etag}:{})});return value;}
    catch(error){if(!conflict(error)||attempt===2)throw error;}
  }
}
async function scrub(storage,key){
  for(let attempt=0;attempt<3;attempt++){
    const current=await storage.get({key});
    if(erased(current.value))return;
    if(current.exists&&!current.etag)throw new Error('Conditional writes required');
    try{await storage.set({key,value:{...TOMBSTONE},...(current.etag?{if_match:current.etag}:{})});return;}
    catch(error){if(!conflict(error)||attempt===2)throw error;}
  }
}
export async function removeAppData(anna,inspect){
  const state=await inspect();
  if(!state.ok||!state.erased)throw new Error('Game removal must be confirmed first');
  for(const key of [CHAT,ART])await scrub(anna.storage,key);
  // Re-read the first page after each deletion batch: no cursor is retained
  // across mutations. A bounded run can be resumed after failure/interruption.
  for(let batch=0;batch<20;batch++){
    const page=await anna.files.list({prefix:'portraits/',limit:100});
    if(!Array.isArray(page.items))throw new Error('Invalid file listing');
    if(!page.items.length){
      if(page.next_cursor)throw new Error('Incomplete file listing');
      for(const key of [CHAT,ART])if(!erased((await anna.storage.get({key})).value))throw new Error('Cleanup changed; retry');
      return {checked:true};
    }
    for(const item of page.items){
      if(typeof item.path!=='string'||!item.path.startsWith('portraits/')||!item.etag)throw new Error('Invalid portrait entry');
      try{await anna.files.delete({path:item.path,if_match:item.etag});}
      catch(error){if(!missing(error))throw error;}
    }
  }
  throw new Error('More portraits remain; retry cleanup');
}
