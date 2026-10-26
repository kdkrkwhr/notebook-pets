package io.github.kdkrkwhr.notebuddy.lab

import android.app.ActivityManager
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.os.BatteryManager
import android.os.PowerManager
import android.util.AtomicFile
import android.util.Log
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.kdkrkwhr.notebuddy.imageprobe.NativeImage
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/** Compiled on PC only. Invocation on a phone requires a separate instruction. */
@RunWith(AndroidJUnit4::class)
class GpuBackendTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val context get()=instrumentation.targetContext
    private fun isolated()=check(context.packageName.endsWith(".lab.ondevice.opencl")) { "Refusing existing user app" }
    private fun reportFile()=File(context.getExternalFilesDir(null),"gpu-check-${UUID.randomUUID()}.json")
    private fun write(file:File,report:JSONObject) {
        val atomic=AtomicFile(file);val stream=atomic.startWrite()
        try {stream.write(report.toString(2).toByteArray());atomic.finishWrite(stream)}
        catch(e:Exception){atomic.failWrite(stream);throw e}
        Log.i("NBGpuProbe",report.toString())
    }
    private fun conditions():JSONObject {
        val memory=ActivityManager.MemoryInfo().also {context.getSystemService(ActivityManager::class.java).getMemoryInfo(it)}
        val battery=context.registerReceiver(null,IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level=battery?.getIntExtra(BatteryManager.EXTRA_LEVEL,-1)?:-1
        val scale=battery?.getIntExtra(BatteryManager.EXTRA_SCALE,-1)?:-1
        return JSONObject().put("thermal",context.getSystemService(PowerManager::class.java).currentThermalStatus)
            .put("batteryTenthsC",battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE,-1)?:-1)
            .put("batteryPercent",if(level>=0&&scale>0)level*100/scale else -1)
            .put("lowMemory",memory.lowMemory).put("availableMemoryBytes",memory.availMem)
    }
    private fun unsafe(c:JSONObject)= c.getInt("thermal")>=PowerManager.THERMAL_STATUS_SEVERE ||
        c.getInt("batteryTenthsC") !in 0 until 420 || c.getInt("batteryPercent") !in 15..100 ||
        c.getBoolean("lowMemory") || c.getLong("availableMemoryBytes")<1024L*1024*1024
    private fun hash(file:File, check:()->Unit={}) :String {
        val md=MessageDigest.getInstance("SHA-256")
        file.inputStream().use {input->val buffer=ByteArray(1024*1024);while(true){check();val n=input.read(buffer);if(n<0)break;md.update(buffer,0,n)}}
        return md.digest().joinToString(""){"%02x".format(it)}
    }
    @Test fun inspectBackendWithoutModel() {
        isolated()
        val file=reportFile();val report=JSONObject().put("mode","backend-inspection-no-model").put("status","STARTED")
        write(file,report) // If a native driver aborts, STARTED is never misreported as success.
        val status=NativeImage.status(BuildConfig.IMAGE_BACKEND)
        report.put("status",if(status.available)"ENUMERATED_NOT_BENCHMARKED" else "UNAVAILABLE")
            .put("requested",status.requested).put("compiled",status.compiled)
            .put("devices",status.devices).put("selected",status.selected).put("error",status.error)
            .put("fullBackendFallback",false).put("cpuOperatorFallback","upstream scheduler may use CPU for unsupported operations; not measured").put("generationExecuted",false)
        write(file,report);assertTrue(status.error,status.available)
    }
    @Test fun boundedSyntheticTextBenchmark() {
        val args=InstrumentationRegistry.getArguments()
        assumeTrue("No implicit phone generation",args.getString("gpuBenchmark")==GpuBenchmarkPolicy.authorization)
        isolated()
        val size=args.getString("probeSize")?.toIntOrNull()?:256
        GpuBenchmarkPolicy.requireRun(context.packageName,BuildConfig.IMAGE_BACKEND,args.getString("gpuBenchmark"),size)
        val backend=NativeImage.requireBackend(BuildConfig.IMAGE_BACKEND)
        val report=JSONObject().put("mode","internal-synthetic-text2img-not-product-output")
            .put("status","STARTED").put("backend",backend).put("fullBackendFallback",false).put("cpuOperatorFallback","upstream scheduler may use CPU for unsupported operations; not measured")
            .put("size",size).put("steps",GpuBenchmarkPolicy.steps).put("seed",GpuBenchmarkPolicy.seed)
            .put("prompt",GpuBenchmarkPolicy.prompt).put("modelSha256",LocalImage.SHA256)
            .put("runtimeCommit","e41fbcf455e0fbb45e08bd535b00d6cba865e921")
        val reportPath=reportFile();write(reportPath,report)
        var activity:GpuProbeActivity?=null
        val stop=AtomicReference<String?>(null)
        var handle=0L;val lock=Any();val monitor=Executors.newSingleThreadScheduledExecutor()
        val started=System.nanoTime()
        ActivityScenario.launch<GpuProbeActivity>(Intent(context,GpuProbeActivity::class.java)).use {scenario->
            scenario.onActivity{activity=it;it.keepAwake(true)}
            try {
                val before=conditions();report.put("before",before);check(!unsafe(before)){"Unsafe initial thermal/battery/memory conditions"}
                monitor.scheduleAtFixedRate({
                    val reason=runCatching {
                        when {
                            activity?.foreground!=true || activity?.stopRequested==true -> "background-or-user-cancel"
                            (System.nanoTime()-started)/1_000_000>GpuBenchmarkPolicy.maxWallMs -> "walltime-limit"
                            unsafe(conditions()) -> "thermal-battery-memory-limit"
                            else -> null
                        }
                    }.getOrElse{"monitor-unavailable"}
                    if(reason!=null){stop.compareAndSet(null,reason);synchronized(lock){if(handle!=0L)NativeImage.cancel(handle)}}
                },0,1,TimeUnit.SECONDS)
                val model=File(context.getExternalFilesDir(null),"models/sd15.safetensors")
                check(model.length()==LocalImage.BYTES){"Existing model missing; no download permitted"}
                check(hash(model){check(stop.get()==null){stop.get().orEmpty()}}==LocalImage.SHA256){"Model hash mismatch"}
                val job=synchronized(lock){NativeImage.create().also {handle=it}}
                check(stop.get()==null){stop.get().orEmpty()}
                val rgb=NativeImage.run(job,model.absolutePath,ByteArray(0),size,GpuBenchmarkPolicy.steps,1f,
                    GpuBenchmarkPolicy.seed,GpuBenchmarkPolicy.prompt,BuildConfig.IMAGE_BACKEND)
                check(stop.get()==null){stop.get().orEmpty()};check(rgb.size==size*size*3)
                val stats=NativeImage.stats(job)
                val pixels=IntArray(size*size){i->(0xff shl 24) or ((rgb[i*3].toInt() and 255) shl 16) or ((rgb[i*3+1].toInt() and 255) shl 8) or (rgb[i*3+2].toInt() and 255)}
                val bitmap=Bitmap.createBitmap(pixels,size,size,Bitmap.Config.ARGB_8888)
                val output=File(reportPath.parentFile,reportPath.nameWithoutExtension+".png")
                output.outputStream().use{check(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))};bitmap.recycle()
                report.put("status","GENERATED_QUALITY_UNREVIEWED").put("output",output.name).put("outputBytes",output.length())
                    .put("outputSha256",hash(output)).put("selectedDevice",NativeImage.selectedDevice(job))
                    .put("modelLoadMs",stats[0]).put("generationMs",stats[1]).put("processLifetimePeakRssKiB",stats[2])
            } catch(e:Exception) {
                report.put("status","FAILED_OR_CANCELLED").put("error",e.message).put("stopReason",stop.get());throw e
            } finally {
                monitor.shutdownNow();synchronized(lock){if(handle!=0L){NativeImage.destroy(handle);handle=0}}
                scenario.onActivity{it.keepAwake(false)}
                report.put("totalWallMs",(System.nanoTime()-started)/1_000_000).put("after",conditions());write(reportPath,report)
            }
        }
    }
}
