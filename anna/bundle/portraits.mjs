import {ART,erased,ErasedError} from './data.mjs';

function safePath(path){
  return typeof path==='string'&&path.startsWith('portraits/')&&
    !path.includes('\\')&&!/[?%#\x00-\x1f]/.test(path)&&
    path.split('/').every(part=>part&&part!=='.'&&part!=='..');
}
async function index(storage){
  const row=await storage.get({key:ART});
  if(erased(row.value))throw new ErasedError();
  // Missing/unreadable indexes are not evidence that all files are unused.
  if(!row.etag||!row.value||Array.isArray(row.value)||typeof row.value!=='object')throw Error('Portrait index unavailable');
  const paths=new Set();
  for(const entry of Object.values(row.value)){
    if(!entry||!safePath(entry.path))throw Error('Invalid portrait reference');
    paths.add(entry.path);
  }
  return {etag:row.etag,paths};
}

// Explicit quiescent cleanup only: other windows and uploads must be stopped.
// File ETags protect file revisions, not cross-key reference transactions.
export async function cleanUnusedPortraits(anna,assertActive){
  await assertActive();
  const before=await index(anna.storage),items=new Map(),cursors=new Set();
  let cursor;
  for(let batch=0;batch<20;batch++){
    const page=await anna.files.list({prefix:'portraits/',limit:100,...(cursor?{cursor}:{})});
    if(!Array.isArray(page.items)||page.items.length>100)throw Error('Invalid portrait listing');
    for(const item of page.items){
      if(!safePath(item.path)||!item.etag)throw Error('Invalid portrait entry');
      if(items.has(item.path)&&items.get(item.path).etag!==item.etag)throw Error('File listing changed');
      items.set(item.path,item);
    }
    if(!page.next_cursor){cursor=null;break;}
    if(typeof page.next_cursor!=='string'||cursors.has(page.next_cursor))throw Error('Invalid listing cursor');
    cursor=page.next_cursor;cursors.add(cursor);
  }
  if(cursor)throw Error('Too many portraits; no cleanup performed');
  let deleted=0;
  // Collect pages before deleting, so deletion cannot invalidate pagination.
  for(const item of items.values()){
    if(before.paths.has(item.path))continue;
    await assertActive();
    const current=await index(anna.storage);
    if(current.etag!==before.etag)throw Error('Portrait index changed; retry');
    if(current.paths.has(item.path))continue;
    try{await anna.files.delete({path:item.path,if_match:item.etag});deleted++;}
    catch(error){if(Number(error?.details?.jsonrpc_code??error?.code)!==-32022&&error?.code!=='not_found')throw error;}
  }
  if((await index(anna.storage)).etag!==before.etag)throw Error('Portrait index changed; retry');
  return {deleted};
}
