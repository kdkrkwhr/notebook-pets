import {CHAT,ART,erased,ErasedError} from './data.mjs';

export async function finishReset(anna,call,id){
  async function guard(){
    const state=await call({action:'inspect'});
    if(state.erased)throw new ErasedError();
    if(!state.ok||!state.reset_pending||state.reset_id!==id)throw Error('Reset changed; refresh');
    return state;
  }
  // Read each row before the guard. A post-reset writer changes its ETag,
  // so delayed cleanup cannot replace that writer's committed conversation.
  for(const [key,value] of [[CHAT,[]],[ART,{}]]){
    const row=await anna.storage.get({key});const state=await guard();
    if(erased(row.value)&&!state.reset_from_erasure)throw new ErasedError();
    if(erased(row.value)&&!row.etag)throw Error('Conditional writes required');
    if(row.exists&&!row.etag)throw Error('Conditional writes required');
    await anna.storage.set({key,value,...(row.etag?{if_match:row.etag}:{})});
  }
  for(let batch=0;batch<20;batch++){
    const page=await anna.files.list({prefix:'portraits/',limit:100});await guard();
    if(!Array.isArray(page.items)||page.items.length>100)throw Error('Invalid listing');
    if(!page.items.length){
      if(page.next_cursor)throw Error('Incomplete listing');
      const result=await call({action:'finish',reset_id:id});
      if(!result.ok||!result.reset_complete)throw Error('Reset changed');
      return;
    }
    for(const item of page.items){
      if(typeof item.path!=='string'||!item.path.startsWith('portraits/')||/[\\%?#\x00-\x1f]/.test(item.path)||item.path.split('/').some(p=>!p||p==='.'||p==='..')||!item.etag)throw Error('Invalid portrait');
      await guard();
      try{await anna.files.delete({path:item.path,if_match:item.etag});}
      catch(error){if(Number(error?.details?.jsonrpc_code??error?.code)!==-32022&&error?.code!=='not_found')throw error;}
    }
  }
  throw Error('More files remain; retry');
}
