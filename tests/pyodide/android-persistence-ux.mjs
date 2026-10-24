import assert from 'node:assert/strict';
import path from 'node:path';

export async function verifyRecoveryUX(page,out,snapshot){
 const ready=()=>page.waitForFunction(()=>document.body.classList.contains('mobile-ready')&&!document.querySelector('#refresh').disabled,{},{timeout:120000});
 const tab=key=>page.locator('#tab-'+key).click();
 const calls=()=>page.evaluate(()=>testCalls.filter(r=>r.action==='complete').length);
 await tab('chat');await page.locator('#message').fill('다음 실행에서도 이어 쓸 초안');
 const before=await snapshot();await page.reload();await ready();await tab('chat');
 assert.equal(await page.locator('#message').inputValue(),'다음 실행에서도 이어 쓸 초안');
 assert.equal(await calls(),0,'restoring drafts must not request inference');assert.deepEqual((await snapshot()).player,before.player);
 // Replace with the same pet, like restoring a backup: the epoch must still invalidate its old draft.
 await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(window.NoteBuddyPlatform.databaseName),s=await m.snapshot(db);await m.commit(db,s.player.revision,s.player.state,s.visuals,true);});
 await page.locator('#open-settings').click();await page.locator('#refresh').click();await ready();await page.locator('[data-close=settings-dialog]').first().click();
 assert.equal(await page.locator('#message').inputValue(),'');
 // Throw at the actual IndexedDB write boundary, after receiving a complete reply.
 await page.evaluate(()=>{
  const put=IDBObjectStore.prototype.put;window.failChatSave=true;
  IDBObjectStore.prototype.put=function(value,key){if(key==='visuals'&&window.failChatSave)throw new DOMException('Test storage quota','QuotaExceededError');return put.apply(this,arguments);};
 });
 const chatBefore=(await snapshot()).visuals.chat.length;
 await page.locator('#message').fill('답장을 다시 생성하지 않고 저장해 줘');await page.locator('#chat button').click();
 await page.locator('#retry-chat-save').waitFor({state:'visible'});
 const generated=await calls();assert.equal(generated,1);assert.equal((await snapshot()).visuals.chat.length,chatBefore);
 assert.equal(await page.locator('#message').inputValue(),'답장을 다시 생성하지 않고 저장해 줘');
 assert.match(await page.locator('.pending-chat .assistant').textContent(),/반가워/);
 await page.locator('#retry-chat-save').click();await page.waitForFunction(()=>!document.querySelector('#retry-chat-save').disabled);
 assert(await page.locator('#retry-chat-save').isVisible());assert.equal(await calls(),generated);
 await tab('friend');await page.locator('[data-action=feed]').click();await ready();await tab('chat');
 assert(await page.locator('#chat button').isDisabled(),'other actions must not unlock another inference while a reply is unsaved');
 await page.screenshot({path:path.join(out,'ux-save-recovery.png')});
 await page.evaluate(()=>window.failChatSave=false);await page.locator('#retry-chat-save').click();
 await page.waitForFunction(()=>document.querySelector('#retry-chat-save').hidden&&!document.querySelector('#chat button').disabled);
 const saved=(await snapshot()).visuals.chat;assert.equal(saved.length,chatBefore+2);assert.equal(new Set(saved.map(x=>x.id)).size,saved.length);
 assert.equal(await calls(),generated,'save-only retry must not infer again');assert.equal(await page.locator('#message').inputValue(),'');
 await page.reload();await ready();await tab('chat');assert.equal(await page.locator('#message').inputValue(),'');assert.equal((await snapshot()).visuals.chat.length,saved.length);
 // Readability: errors remain until acted on, rather than disappearing after six seconds.
 await page.evaluate(()=>document.querySelector('#notice').textContent='저장에 실패했어요. 다시 시도해 주세요.');
 await page.waitForTimeout(6200);assert(await page.locator('#notice').isVisible());assert.equal(await page.locator('#notice').getAttribute('role'),'alert');
 await page.locator('#notice-dismiss').click();assert(await page.locator('#notice').isHidden());
 // A long imported history must not create a thousand DOM bubbles or a huge model context.
 await page.evaluate(async()=>{const m=await import('./store.js'),db=await m.openStore(window.NoteBuddyPlatform.databaseName),s=await m.load(db);await m.updateVisuals(db,s.epoch,s.state.pet_id,v=>({...v,chat:Array.from({length:1000},(_,i)=>({id:'history-'+i,role:i%2?'assistant':'user',text:'오래된 대화 '+i,at:i}))}));});
 await page.reload();await ready();await tab('chat');assert.equal(await page.locator('#messages > .message').count(),24);
 await page.locator('#message').fill('새로운 이야기');await page.locator('#chat button').click();await page.waitForFunction(()=>!document.querySelector('#chat button').disabled);
 assert.equal(await page.locator('#messages > .message').count(),24,'pending bubbles must not consume the saved-message display budget');
 assert.equal((await snapshot()).visuals.chat.length,64);assert.equal(await page.evaluate(()=>testCalls.filter(r=>r.action==='complete').at(-1).payload.messages.length),5);
 const notebook=await snapshot();
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('test-engine-failure')!=='yes')return;
  const Original=window.Worker;window.Worker=class extends Original{constructor(url,options){super(url,options);this.terminate();setTimeout(()=>this.dispatchEvent(new ErrorEvent('error',{message:'Injected worker initialization failure',cancelable:true})),0);}};
 });
 await page.evaluate(()=>sessionStorage.setItem('test-engine-failure','yes'));await page.reload();await page.locator('#native-reopen').waitFor({state:'visible'});
 assert.match(await page.locator('#native-startup-heading').textContent(),/열지 못했/);assert.deepEqual((await snapshot()).player,notebook.player);
 await page.screenshot({path:path.join(out,'ux-startup-recovery.png')});await page.evaluate(()=>sessionStorage.removeItem('test-engine-failure'));
 await page.locator('#native-reopen').click();await ready();assert(await page.locator('#native-startup').count()===0);assert.deepEqual((await snapshot()).player,notebook.player);
 return {draftReload:true,samePetReplacementClearsDraft:true,quotaFailure:true,saveOnlyRetry:true,noDuplicateChat:true,noRepeatInference:true,persistentErrors:true,thousandMessageHistory:true,startupRecovery:true};
}
