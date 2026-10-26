package io.github.kdkrkwhr.notebuddy.imageprobe

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.BatteryManager
import android.content.Intent
import android.content.IntentFilter
import android.app.ActivityManager
import android.util.AtomicFile
import android.view.WindowManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.*
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.UUID

/** Isolated synthetic-only feasibility app. No access to the user's Notebuddy apps. */
class ProbeActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val busy = AtomicBoolean(false)
    private val cancelled = AtomicBoolean(false)
    private val handleLock = Any()
    private var handle = 0L
    private lateinit var message: TextView
    private lateinit var output: ImageView
    private lateinit var start: Button
    private lateinit var save: Button
    private var preview: File? = null
    private var foreground = false
    private var generationStartedMs = 0L
    private var cancelReason = ""
    private val autoStart = Runnable { if (foreground) generate() }
    private val model get() = File(getExternalFilesDir(null), "models/sd15.safetensors")
    private val prompt = "One cute fantasy monster, green oval body, two triangular ears, two large eyes, two small feet, red diamond marking on the right side of its belly. Preserve the green silhouette and red diamond. Soft painted game character, friendly expression, gentle shading, plain white background, centered, no text."
    private val monitor = object : Runnable {
        override fun run() {
            if (!busy.get()) return
            val thermal = getSystemService(PowerManager::class.java).currentThermalStatus
            if (thermal >= PowerManager.THERMAL_STATUS_SEVERE) stop("기기가 뜨거워 생성을 중단합니다.")
            val battery=registerReceiver(null,IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val temperature=battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE,0)?:0
            val level=battery?.getIntExtra(BatteryManager.EXTRA_LEVEL,100)?:100
            val plugged=battery?.getIntExtra(BatteryManager.EXTRA_PLUGGED,0)?:0
            if(temperature>=420 || (level<=15 && plugged==0))stop("기기 상태를 보호하기 위해 생성을 중단합니다.")
            val memory=ActivityManager.MemoryInfo().also {getSystemService(ActivityManager::class.java).getMemoryInfo(it)}
            if(memory.lowMemory || memory.availMem<512L*1024*1024)stop("사용 가능한 메모리가 부족해 생성을 중단합니다.")
            if(android.os.SystemClock.elapsedRealtime()-generationStartedMs>10*60*1000)stop("실험 제한 시간을 지나 생성을 중단합니다.")
            val progress = synchronized(handleLock) { if(handle != 0L) NativeImage.progress(handle) else null }
            if(progress != null && progress[1] > 0 && !cancelled.get()) message.text = "휴대폰에서 생성 중 · ${progress[0]}/${progress[1]}"
            main.postDelayed(this, 1000)
        }
    }
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val layout = LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(28,60,28,36) }
        message=TextView(this).apply { text="합성 그림만 사용하는 온디바이스 실험입니다. 원본과 생성 결과는 별도로 보존됩니다."; textSize=17f }
        val input=ImageView(this).apply { setImageBitmap(BitmapFactory.decodeStream(assets.open("green-creature.png"))); adjustViewBounds=true }
        output=ImageView(this).apply { adjustViewBounds=true }
        start=Button(this).apply { text="휴대폰에서 몬스터 생성"; setOnClickListener { generate() } }
        val cancel=Button(this).apply { text="생성 취소"; setOnClickListener { stop("취소 처리 중…") } }
        save=Button(this).apply { text="이 생성 결과 저장"; isEnabled=false; setOnClickListener {
            val candidate=preview ?: return@setOnClickListener
            val target=AtomicFile(File(filesDir,"generated-${UUID.randomUUID()}.png"))
            var stream:java.io.FileOutputStream?=null
            try { stream=target.startWrite();candidate.inputStream().use {it.copyTo(stream)};target.finishWrite(stream);message.text="생성 결과를 별도 저장했습니다.";isEnabled=false }
            catch(e:Exception){target.failWrite(stream);message.text="저장하지 못했습니다. 미리보기와 원본은 보존됩니다."}
        } }
        layout.addView(message);layout.addView(TextView(this).apply {text="원본 · 합성 그림"});layout.addView(input,LinearLayout.LayoutParams(-1,240));layout.addView(start);layout.addView(cancel);layout.addView(TextView(this).apply {text="새로 생성한 결과 · 성공 후 표시"});layout.addView(output,LinearLayout.LayoutParams(-1,350));layout.addView(save)
        setContentView(ScrollView(this).apply { addView(layout) })
        File(getExternalFilesDir(null),"models").mkdirs()
        if(BuildConfig.DEBUG && intent.getBooleanExtra("autoGenerate",false)) main.postDelayed(autoStart,800)
    }
    private fun stop(text:String) {
        cancelReason=text
        cancelled.set(true)
        synchronized(handleLock){if(handle!=0L)NativeImage.cancel(handle)}
        if(busy.get())message.text=text
    }
    private fun sha(file:File):String {
        val digest=MessageDigest.getInstance("SHA-256")
        file.inputStream().use { source -> val buffer=ByteArray(1024*1024); while(true){if(cancelled.get())throw IllegalStateException("Cancelled");val n=source.read(buffer);if(n<0)break;digest.update(buffer,0,n)} }
        return digest.digest().joinToString(""){"%02x".format(it)}
    }
    private fun generate() {
        if(!foreground || worker.isShutdown)return
        if(!busy.compareAndSet(false,true))return
        cancelled.set(false);preview=null;output.setImageDrawable(null);start.isEnabled=false;save.isEnabled=false;message.text="모델 무결성 확인 중…"
        cancelReason=""
        // Keep only this visible window awake during the explicit generation.
        // Never alter global screen timeout, lock settings or background wake locks.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        generationStartedMs=android.os.SystemClock.elapsedRealtime()
        runCatching {File(getExternalFilesDir(null),"probe-result.json").writeText(JSONObject().put("status","RUNNING").toString())}
        val begin=System.nanoTime();main.post(monitor)
        worker.execute {
            var result:File?=null
            try {
                check(model.length()==4265146304L){"모델 준비가 필요합니다. 생성은 실행하지 않았습니다."}
                check(sha(model)=="6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa"){"모델 검증 실패"}
                check(!cancelled.get()){"Cancelled"}
                val size=256;val steps=12;val strength=.55f;val seed=1026L
                val original=BitmapFactory.decodeStream(assets.open("green-creature.png"))
                val resized=Bitmap.createScaledBitmap(original,size,size,true)
                val pixels=IntArray(size*size);resized.getPixels(pixels,0,size,0,0,size,size)
                val rgb=ByteArray(size*size*3);pixels.forEachIndexed { i,c -> rgb[i*3]=(c shr 16).toByte();rgb[i*3+1]=(c shr 8).toByte();rgb[i*3+2]=c.toByte() }
                resized.recycle();if(original!==resized)original.recycle()
                val job=synchronized(handleLock){NativeImage.create().also {handle=it;if(cancelled.get())NativeImage.cancel(it)}}
                main.post { message.text="휴대폰 CPU에서 모델 준비·이미지 생성 중…" }
                val generated=NativeImage.run(job,model.absolutePath,rgb,size,steps,strength,seed,prompt,BuildConfig.IMAGE_BACKEND)
                check(!cancelled.get()){"Cancelled"}
                check(generated.size==rgb.size && !generated.contentEquals(rgb)){"새 이미지가 생성되지 않았습니다."}
                val stats=NativeImage.stats(job)
                val colors=IntArray(size*size) { i -> (0xff shl 24) or ((generated[i*3].toInt() and 255) shl 16) or ((generated[i*3+1].toInt() and 255) shl 8) or (generated[i*3+2].toInt() and 255) }
                val bitmap=Bitmap.createBitmap(colors,size,size,Bitmap.Config.ARGB_8888)
                result=File(cacheDir,"generated-${System.nanoTime()}.png")
                result.outputStream().use {check(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))};bitmap.recycle()
                val report=JSONObject().put("status","GENERATED_PENDING_VISUAL_REVIEW").put("device",android.os.Build.MODEL).put("backend",NativeImage.selectedDevice(job)).put("size",size).put("steps",steps).put("strength",strength).put("seed",seed).put("modelLoadMs",stats[0]).put("generationMs",stats[1]).put("processPeakRssKiB",stats[2]).put("totalWallMs",(System.nanoTime()-begin)/1000000).put("outputBytes",result.length()).put("outputSha256",sha(result)).put("thermalStatusAfter",getSystemService(PowerManager::class.java).currentThermalStatus).put("runtimeCommit","e41fbcf455e0fbb45e08bd535b00d6cba865e921").put("prompt",prompt)
                report.put("outputFileName",result.name)
                File(getExternalFilesDir(null),"probe-result.json").writeText(report.toString(2))
                val completed=result
                main.post { if(!isFinishing && !isDestroyed && !cancelled.get()){preview=completed;output.setImageBitmap(BitmapFactory.decodeFile(completed.absolutePath));save.isEnabled=true;message.text="새 이미지 미리보기 · ${stats[1]/1000}초. 확인 후 저장하세요."} }
            } catch(e:Exception) {
                result?.delete()
                val error=if(cancelled.get())"생성을 취소했습니다. 기존 자료는 변경하지 않았습니다." else (e.message?:"생성 실패")
                runCatching {
                    val failure=JSONObject().put("status",if(cancelled.get())"CANCELLED" else "FAILED").put("error",error).put("stopReason",cancelReason).put("totalWallMs",(System.nanoTime()-begin)/1000000)
                    val stats=synchronized(handleLock){if(handle!=0L)NativeImage.stats(handle) else null}
                    if(stats!=null)failure.put("modelLoadMs",stats[0]).put("generationMs",stats[1]).put("processPeakRssKiB",stats[2])
                    File(getExternalFilesDir(null),"probe-result.json").writeText(failure.toString(2))
                }
                main.post {if(!isDestroyed)message.text=error}
            } finally {
                synchronized(handleLock){if(handle!=0L){NativeImage.destroy(handle);handle=0}}
                busy.set(false);main.removeCallbacks(monitor);main.post {window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);start.isEnabled=true}
            }
        }
    }
    override fun onStart(){super.onStart();foreground=true}
    override fun onStop(){foreground=false;main.removeCallbacks(autoStart);stop("화면을 떠나 생성을 취소합니다.");super.onStop()}
    override fun onDestroy(){main.removeCallbacks(monitor);worker.shutdown();super.onDestroy()}
}
