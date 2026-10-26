package io.github.kdkrkwhr.notebuddy.lab

import android.content.Intent
import android.graphics.Bitmap
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Never reset the user notebook: every game mutation is in the explicit debug test database. */
@RunWith(AndroidJUnit4::class)
@org.junit.Ignore("Archived mobile-shell UI. Current Anna adapter is covered by android-anna-parity.mjs; device lifecycle parity remains unverified.")
class GameSmokeTest {
    private lateinit var activity: GameActivity
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
    private fun js(source: String): JsonElement {
        val latch = CountDownLatch(1); var result = "null"
        instrumentation.runOnMainSync { activity.gameView.evaluateJavascript(source) { result=it;latch.countDown() } }
        check(latch.await(15,TimeUnit.SECONDS)) { "JavaScript callback timed out" }
        return JsonParser.parseString(result)
    }
    private fun until(source: String, timeout: Long = 120000) {
        val end=System.currentTimeMillis()+timeout
        while(System.currentTimeMillis()<end) { if(runCatching { js(source).asBoolean }.getOrDefault(false))return;Thread.sleep(150) }
        error("Timed out: $source; notice="+runCatching { js("document.querySelector('#notice')?.textContent").toString() }.getOrNull())
    }
    private fun async(source: String): JsonElement {
        js("window.__gameTestResult=null;window.__gameTestError=null;(async()=>{$source})().then(v=>window.__gameTestResult=JSON.stringify(v??true)).catch(e=>window.__gameTestError=String(e))")
        until("window.__gameTestResult!==null||window.__gameTestError!==null")
        val error=js("window.__gameTestError");check(error.isJsonNull) { error.toString() }
        return JsonParser.parseString(js("window.__gameTestResult").asString)
    }
    @Test fun offlineGameAndOptionalLocalChatPreserveUserData() {
        val context=instrumentation.targetContext
        fun hashes()=listOf("input.png","appearance.json","chat.json").associateWith { name ->
            File(context.filesDir,name).takeIf { it.isFile }?.readBytes()?.let { b->MessageDigest.getInstance("SHA-256").digest(b).joinToString(""){"%02x".format(it)} }
        }
        val before=hashes()
        val intent=Intent(context,GameActivity::class.java).putExtra("testNotebook",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<GameActivity>(intent).use { scenario ->
            scenario.onActivity { activity=it }
            until("!!window.NoteBuddyPlatform&&document.body.classList.contains('mobile-ready')")
            assertEquals("notebuddy-android-test",js("window.NoteBuddyPlatform.databaseName").asString)
            val userBefore=async("const s=await import(new URL('./store.js',location.href).href);return await s.snapshot(await s.openStore('notebuddy-android'))")
            async("const s=await import(new URL('./store.js',location.href).href),db=await s.openStore(window.NoteBuddyPlatform.databaseName),old=await s.load(db);await s.commit(db,old.revision,null);return true")
            js("document.querySelector('#title-start').click();document.querySelector('#refresh').click()")
            until("!document.querySelector('#refresh').disabled")
            js("document.querySelector('#choose-art').click();document.querySelector('#art-input-mode').value='file';document.querySelector('#art-input-mode').dispatchEvent(new Event('change'))")
            async("const blob=await(await fetch('./assets/starters-v1/mammal_fire_stage1.png')).blob(),dt=new DataTransfer();dt.items.add(new File([blob],'test.png',{type:'image/png'}));const el=document.querySelector('#art-file');el.files=dt.files;el.dispatchEvent(new Event('change'));return true")
            until("!document.querySelector('#art-use').disabled")
            js("document.querySelector('#art-use').click()")
            until("!document.querySelector('#art-dialog').open")
            js("document.querySelector('#name').value='기기 검증 친구';document.querySelector('#birth').requestSubmit()")
            until("document.querySelector('#pet-name').textContent==='기기 검증 친구'&&!document.querySelector('#refresh').disabled")
            js("const care=document.querySelector('#care-ai-enabled');care.checked=false;care.dispatchEvent(new Event('change'));document.querySelector('[data-action=feed]').click()")
            until("!document.querySelector('#refresh').disabled")
            val save=async("const s=await import(new URL('./store.js',location.href).href);return await s.snapshot(await s.openStore(window.NoteBuddyPlatform.databaseName))")
            assertTrue(save.asJsonObject.getAsJsonObject("player").getAsJsonObject("state").get("xp").asInt>0)
            js("document.querySelector('#open-home').click()")
            until("document.querySelector('#home-dialog').open&&!document.querySelector('#refresh').disabled")
            assertTrue(js("document.querySelector('#home-appearance-generate').hidden").asBoolean)
            js("document.querySelector('#home-appearance-default').click()")
            until("document.querySelector('#home-canvas').dataset.appearance==='default'&&!document.querySelector('#refresh').disabled")
            instrumentation.runOnMainSync { activity.onBackPressedDispatcher.onBackPressed() }
            until("!document.querySelector('#home-dialog').open")
            // Remote content cannot be loaded into the offline game.
            assertTrue(async("try{return (await fetch('https://example.com/blocked')).status===403}catch{return true}").asBoolean)
            // A real WebView recreation must restore the bounded draft without running AI.
            js("document.querySelector('#tab-chat').click();const input=document.querySelector('#message');input.value='다시 열어도 남아 있는 초안';input.dispatchEvent(new Event('input'))")
            scenario.recreate(); scenario.onActivity { activity=it }
            until("document.body.classList.contains('mobile-ready')&&!document.querySelector('#refresh').disabled")
            assertEquals("다시 열어도 남아 있는 초안",js("document.querySelector('#message').value").asString)
            instrumentation.runOnMainSync {
                assertEquals((activity.resources.configuration.fontScale*100).toInt().coerceIn(50,300),activity.gameView.settings.textZoom)
                activity.gameView.settings.textZoom=200
            }
            js("document.querySelector('#tab-chat').click()")
            async("await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true")
            until("document.querySelector('#chat').getBoundingClientRect().bottom<=innerHeight+1")
            assertTrue(js("document.documentElement.scrollWidth<=innerWidth+1").asBoolean)
            assertTrue(js("document.querySelector('.mobile-tabs').getBoundingClientRect().bottom<=innerHeight+1").asBoolean)
            instrumentation.runOnMainSync { activity.gameView.settings.textZoom=100 }
            if(InstrumentationRegistry.getArguments().getString("liveGame")=="true") {
                js("document.querySelector('#message').value='안녕! 내 이름은 동기야. 짧게 인사해 줘.';document.querySelector('#chat').requestSubmit()")
                until("!document.querySelector('#chat button').disabled",180000)
                assertTrue(js("document.querySelectorAll('#messages .assistant').length>0").asBoolean)
            }
            val userAfter=async("const s=await import(new URL('./store.js',location.href).href);return await s.snapshot(await s.openStore('notebuddy-android'))")
            assertEquals("User game untouched",userBefore,userAfter)
            // Optional crash injection is only enabled in an isolated emulator run.
            if (InstrumentationRegistry.getArguments().getString("rendererRecovery")=="true") {
                var terminated=false
                instrumentation.runOnMainSync { terminated=activity.gameView.webViewRenderProcess?.terminate()==true }
                assertTrue("Renderer must be running",terminated)
                val deadline=System.currentTimeMillis()+30000
                var prompt=false
                while(!prompt&&System.currentTimeMillis()<deadline) {
                    scenario.onActivity { prompt=it.recoveryDialog?.isShowing==true }
                    if(!prompt)Thread.sleep(200)
                }
                assertTrue("Recoverable renderer failure dialog",prompt)
                val crashReports=File(context.getExternalFilesDir(null),"reports").also { it.mkdirs() }
                instrumentation.uiAutomation.takeScreenshot()?.let { bitmap->File(crashReports,"renderer-recovery.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG,100,it) };bitmap.recycle() }
                scenario.onActivity { assertTrue(it.recoveryDialog!!.getButton(android.app.AlertDialog.BUTTON_POSITIVE).performClick()) }
                // ActivityScenario observes the replacement Activity.
                Thread.sleep(600);scenario.onActivity { activity=it }
                until("document.body.classList.contains('mobile-ready')&&!document.querySelector('#refresh').disabled")
                assertEquals("다시 열어도 남아 있는 초안",js("document.querySelector('#message').value").asString)
                assertEquals(userBefore,async("const s=await import(new URL('./store.js',location.href).href);return await s.snapshot(await s.openStore('notebuddy-android'))"))
            }
            val reports=File(context.getExternalFilesDir(null),"reports").also { it.mkdirs() }
            instrumentation.uiAutomation.takeScreenshot()?.let { bitmap->File(reports,"game-test.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG,100,it) };bitmap.recycle() }
            File(reports,"game-test.json").writeText("""{"game":true,"sharedPython":true,"defaultHome":true,"externalBlocked":true,"userGameUnchanged":true,"localChat":${InstrumentationRegistry.getArguments().getString("liveGame")=="true"}}""")
        }
        assertEquals("Lab photo/profile/chat unchanged",before,hashes())
    }
}
