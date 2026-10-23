import assert from 'node:assert/strict';
import path from 'node:path';

export async function verifyMobileUX(page,out,snapshot){
  const tab=key=>page.locator('#tab-'+key).click();
  const fits=selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;});
  for(const [width,height]of [[320,640],[360,800],[412,892],[800,360]]){
    await page.setViewportSize({width,height});
    for(const key of ['friend','chat','adventure','journal']){
      await tab(key);
      assert.equal(await page.locator('.mobile-screen:visible').count(),1);
      assert(await fits('.mobile-tabs'),`navigation outside ${width}x${height}`);
      assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1),'document itself must not scroll');
      const target=key==='friend'?'#open-home':key==='chat'?'#chat button':key==='adventure'?'[data-action=walk]':'#open-album';
      assert((await page.locator(target).boundingBox()).height>=43,`touch target ${target}`);
      if(key==='chat')assert(await fits('#chat'),'chat composer must remain in viewport');
      await page.screenshot({path:path.join(out,`ux-${key}-${width}x${height}.png`)});
    }
  }
  await page.setViewportSize({width:360,height:800});await tab('journal');
  await page.locator('#screen-journal').evaluate(el=>el.scrollTop=150);const scroll=await page.locator('#screen-journal').evaluate(el=>el.scrollTop);
  await tab('friend');await tab('journal');assert.equal(await page.locator('#screen-journal').evaluate(el=>el.scrollTop),scroll);
  await page.evaluate(()=>window.NoteBuddyBack());assert.equal(await page.locator('body').getAttribute('data-screen'),'friend');
  await page.locator('#open-home').click();assert(await fits('#home-dialog'));assert((await page.locator('#home-canvas').boundingBox()).height>200);
  await page.locator('#home-shop-toggle').click();assert(await fits('#home-shop-close'));await page.screenshot({path:path.join(out,'ux-home-shop.png')});
  await page.evaluate(()=>window.NoteBuddyBack());assert(await page.locator('#home-shop-panel').isHidden());assert(await page.locator('#home-dialog').isVisible());
  await page.screenshot({path:path.join(out,'ux-home.png')});await page.evaluate(()=>window.NoteBuddyBack());assert(await page.locator('#home-dialog').isHidden());
  await page.locator('#open-evolution').click();assert(await fits('#evolution-dialog'));assert(await fits('#evolution-dialog>header'));assert(await fits('#evolution-dialog>footer'));await page.screenshot({path:path.join(out,'ux-evolution.png')});await page.evaluate(()=>window.NoteBuddyBack());
  // A slow response must show the outgoing message immediately, stay cancellable
  // in a modal, preserve the draft on cancel, and ignore late native output.
  await tab('chat');const before=(await snapshot()).visuals.chat.length;
  await page.evaluate(()=>window.testDelay=1800);await page.locator('#message').fill('천천히 대답해 줘');await page.locator('#chat button').click();
  await page.waitForFunction(()=>!document.querySelector('#mobile-ai').hidden);
  assert.match(await page.locator('.pending-chat .user').textContent(),/천천히/);
  assert(await page.locator('#chat button').isDisabled());await tab('friend');assert(await page.locator('[data-action=feed]').isDisabled());
  await page.locator('#open-settings').click();assert.equal(await page.locator('#mobile-ai').evaluate(el=>el.parentElement.id),'settings-dialog');
  await page.locator('#mobile-ai-cancel').click();await page.waitForFunction(()=>document.querySelector('#mobile-ai').hidden);
  await page.locator('[data-close=settings-dialog]').first().click();await tab('chat');
  assert.equal(await page.locator('#message').inputValue(),'천천히 대답해 줘');assert(await page.locator('.pending-chat').count()===0);
  await page.waitForTimeout(1900);assert.equal((await snapshot()).visuals.chat.length,before);await page.evaluate(()=>window.testDelay=0);
  await page.setViewportSize({width:360,height:360});await page.evaluate(()=>window.dispatchEvent(new CustomEvent('native-keyboard',{detail:true})));
  assert(await page.locator('.mobile-tabs').isHidden());assert(await fits('#chat'));assert((await page.locator('#messages').boundingBox()).height>=50);
  await page.screenshot({path:path.join(out,'ux-keyboard.png')});await page.evaluate(()=>window.dispatchEvent(new CustomEvent('native-keyboard',{detail:false})));
  await page.setViewportSize({width:360,height:800});await tab('friend');
  await page.locator('#open-settings').click();await page.locator('#open-theme').click();
  await page.locator('[data-palette=night]').click();await page.locator('#theme-done').click();await page.locator('[data-close=settings-dialog]').first().click();
  await page.screenshot({path:path.join(out,'ux-night-friend.png')});await tab('chat');await page.screenshot({path:path.join(out,'ux-night-chat.png')});
  await page.locator('#open-settings').click();await page.locator('#open-theme').click();await page.locator('[data-palette=notebook]').click();await page.locator('#theme-done').click();await page.locator('[data-close=settings-dialog]').first().click();await tab('friend');
  return {tabs:true,scrollRestored:true,touchTargets:true,keyboard:true,homeShopBack:true,fullScreenEvolution:true,pendingChat:true,cancelLateReply:true,viewports:4};
}
