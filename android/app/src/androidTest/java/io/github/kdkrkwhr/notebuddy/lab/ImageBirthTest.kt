package io.github.kdkrkwhr.notebuddy.lab

import android.content.Intent
import android.graphics.Bitmap
import android.util.Base64
import android.view.WindowManager
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Explicit opt-in real phone inference, only in the separately installed test package. */
@RunWith(AndroidJUnit4::class)
class ImageBirthTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private lateinit var activity:GameActivity
    private fun js(source:String):JsonElement {
        val latch=CountDownLatch(1);var result="null"
        instrumentation.runOnMainSync {activity.gameView.evaluateJavascript(source){result=it;latch.countDown()}}
        check(latch.await(15,TimeUnit.SECONDS)){"JS callback timeout"};return JsonParser.parseString(result)
    }
    private fun until(source:String,timeout:Long=90000){
        val end=System.currentTimeMillis()+timeout
        while(System.currentTimeMillis()<end){if(runCatching{js(source).asBoolean}.getOrDefault(false))return;Thread.sleep(200)}
        error("Timeout: $source; "+js("document.querySelector('#birth-generation-status')?.textContent"))
    }
    private fun async(source:String):JsonElement {
        js("window.__imageTestResult=null;window.__imageTestError=null;(async()=>{$source})().then(v=>window.__imageTestResult=JSON.stringify(v??true)).catch(e=>window.__imageTestError=String(e))")
        until("window.__imageTestResult!==null||window.__imageTestError!==null")
        check(js("window.__imageTestError").isJsonNull){js("window.__imageTestError").toString()}
        return JsonParser.parseString(js("window.__imageTestResult").asString)
    }
    @Test fun realGenerationCancelSaveAndRecreate(){
        val context=instrumentation.targetContext
        assumeTrue(BuildConfig.LOCAL_IMAGE_ENABLED && InstrumentationRegistry.getArguments().getString("liveImage")=="true")
        check(context.packageName=="io.github.kdkrkwhr.notebuddy.lab.ondevice"){"Run only in the separate ondevice package"}
        val intent=Intent(context,GameActivity::class.java).putExtra("testNotebook",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ActivityScenario.launch<GameActivity>(intent).use {scenario->
            scenario.onActivity{activity=it}
            until("document.body.classList.contains('mobile-ready')")
            assertEquals("notebuddy-android-test",js("window.NoteBuddyPlatform.databaseName").asString)
            val userBefore=async("const s=await import('./store.js');return s.snapshot(await s.openStore('notebuddy-android'))")
            async("const s=await import('./store.js'),db=await s.openStore('notebuddy-android-test'),old=await s.load(db);await s.commit(db,old.revision,null);return true")
            js("document.querySelector('#refresh').click()")
            until("!document.querySelector('#refresh').disabled")
            assertTrue(async("const n=await import('./native.js');return (await n.status()).localImageReady").asBoolean)
            // The approved existing text weights were copied locally, never downloaded by this test.
            assertEquals(ModelSpec.GEMMA.bytes,File(context.getExternalFilesDir(null),"models/"+ModelSpec.GEMMA.name).length())
            async("const n=await import('./native.js');await n.call('verifyModel');return true")
            assertTrue(async("const n=await import('./native.js');return (await n.status()).ready").asBoolean)
            // Reject malformed image requests without inference or game mutations.
            assertTrue(async("const n=await import('./native.js');try{await n.call('generateImage',{image:'invalid'});return false}catch{return true}").asBoolean)
            Thread.sleep(500)
            js("document.querySelector('#choose-art').click();document.querySelector('#art-input-mode').value='file';document.querySelector('#art-input-mode').dispatchEvent(new Event('change'))")
            async("const blob=await(await fetch('/assets/green-creature.png')).blob(),dt=new DataTransfer();dt.items.add(new File([blob],'synthetic.png',{type:'image/png'}));const el=document.querySelector('#art-file');el.files=dt.files;el.dispatchEvent(new Event('change'));return true")
            until("!document.querySelector('#art-use').disabled")
            js("document.querySelector('#art-use').click()")
            until("!document.querySelector('#art-dialog').open&&!document.querySelector('#birth-generate').disabled")
            // Cancel the analysis stage first; do not spend a second SD run on cancellation.
            js("document.querySelector('#birth-generate').click()")
            until("!document.querySelector('#birth-generation-cancel').hidden")
            js("document.querySelector('#birth-generation-cancel').click()")
            until("!document.querySelector('#birth-generate').disabled&&document.querySelector('#birth-generated-figure').hidden")
            async("const n=await import('./native.js');for(let i=0;i<120;i++){if(!(await n.status()).busy)return true;await new Promise(r=>setTimeout(r,500));}throw Error('Cancelled worker did not stop')")
            // One requested inference: a repeated tap must not start another one.
            js("document.querySelector('#birth-generate').click();document.querySelector('#birth-generate').click()")
            until("!document.querySelector('#birth-analysis-confirm').hidden||!document.querySelector('#birth-generated-figure').hidden||document.querySelector('#birth-analysis-kind').textContent.length>0",240000)
            if(!js("document.querySelector('#birth-analysis-confirm').hidden").asBoolean)js("document.querySelector('#birth-analysis-confirm').click()")
            until("!document.querySelector('#birth-generation-cancel').hidden")
            instrumentation.runOnMainSync {assertTrue(activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON != 0)}
            until("!document.querySelector('#birth-generated-figure').hidden",600000)
            until("document.querySelector('#birth-generation-cancel').hidden")
            instrumentation.runOnMainSync {assertEquals(0,activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)}
            assertTrue(async("const s=await import('./store.js');return !(await s.load(await s.openStore('notebuddy-android-test'))).state").asBoolean)
            val previewBefore=js("document.querySelector('#birth-analysis-features').textContent").asString
            scenario.recreate();scenario.onActivity{activity=it}
            until("document.body.classList.contains('mobile-ready')&&!document.querySelector('#birth-generated-figure').hidden")
            assertEquals(previewBefore,js("document.querySelector('#birth-analysis-features').textContent").asString)
            val data=async("const blob=await(await fetch(document.querySelector('#birth-generated-preview').src)).blob();return new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(blob)})").asString
            val reports=File(context.getExternalFilesDir(null),"image-reports").also{it.mkdirs()}
            File(reports,"generated.png").writeBytes(Base64.decode(data.substringAfter(','),Base64.NO_WRAP))
            js("document.querySelector('#name').value='합성 친구';document.querySelector('#birth').requestSubmit()")
            until("document.querySelector('#pet-name').textContent==='합성 친구'&&!document.querySelector('#refresh').disabled")
            val saved=async("const s=await import('./store.js');return s.snapshot(await s.openStore('notebuddy-android-test'))")
            val art=saved.asJsonObject.getAsJsonObject("visuals").getAsJsonObject("art")
            assertEquals(2,art.size());assertEquals(2,art.entrySet().map{it.value.asJsonObject["hash"].asString}.distinct().size)
            val inferenceRecord=File(context.getExternalFilesDir(null),"last-image-generation.json").readText()
            scenario.recreate();scenario.onActivity{activity=it}
            until("document.body.classList.contains('mobile-ready')&&document.querySelector('#pet-name').textContent==='합성 친구'")
            val restored=async("const s=await import('./store.js');return s.snapshot(await s.openStore('notebuddy-android-test'))")
            assertEquals(saved,restored)
            assertEquals(inferenceRecord,File(context.getExternalFilesDir(null),"last-image-generation.json").readText())
            assertEquals(userBefore,async("const s=await import('./store.js');return s.snapshot(await s.openStore('notebuddy-android'))"))
            assertTrue(js("document.querySelector('#pet-image').complete&&document.querySelector('#pet-image').naturalWidth>0").asBoolean)
            instrumentation.uiAutomation.takeScreenshot()?.let {bitmap->File(reports,"saved-game.png").outputStream().use{bitmap.compress(Bitmap.CompressFormat.PNG,100,it)};bitmap.recycle()}
            File(reports,"verification.json").writeText("""{"realPhoneGeneration":true,"cancel":true,"invalidRequest":true,"duplicateTap":true,"explicitSave":true,"originalGeneratedSeparate":true,"recreatePreserved":true,"noRegenerationOnRecreate":true,"normalNotebookUnchanged":true,"metrics":$inferenceRecord}""")
        }
    }
}
