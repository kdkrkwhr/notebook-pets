package io.github.kdkrkwhr.notebuddy.lab

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.BatteryManager
import android.os.SystemClock
import android.app.ActivityManager
import android.content.Intent
import android.content.IntentFilter
import android.view.WindowManager
import android.util.Base64
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.*
import com.google.ai.edge.litertlm.Message
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.ByteArrayInputStream
import java.io.File
import java.util.concurrent.CancellationException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** Offline UI and the shared Python engine. The only AI transport is the local model. */
class GameActivity : ComponentActivity() {
    companion object {
        const val ORIGIN = "https://appassets.androidplatform.net"
        const val GAME = "$ORIGIN/assets/game/index.html"
    }
    internal lateinit var gameView: WebView
    private val worker = Executors.newSingleThreadExecutor()
    private val busy = AtomicBoolean(false)
    private val stopped = AtomicBoolean(false)
    @Volatile private var activeId: String? = null
    private var rendererGone = false
    internal var recoveryDialog: AlertDialog? = null
        private set
    private lateinit var models: ModelFiles
    private lateinit var ai: LocalAI
    private lateinit var images: LocalImage
    private val imageHandler=Handler(Looper.getMainLooper())
    private var imageActive=false
    private var imageStarted=0L
    private var imageNotice:((Map<String,Any>)->Unit)?=null
    private var imageStopReason=""
    private val imageMonitor=object:Runnable {
        override fun run(){
            if(!imageActive)return
            val battery=registerReceiver(null,IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val temperature=battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE,0)?:0
            val memory=ActivityManager.MemoryInfo().also {getSystemService(ActivityManager::class.java).getMemoryInfo(it)}
            val elapsed=SystemClock.elapsedRealtime()-imageStarted
            val reason=when {
                getSystemService(PowerManager::class.java).currentThermalStatus>=PowerManager.THERMAL_STATUS_SEVERE || temperature>=420 -> "기기가 뜨거워 생성을 멈췄어요. 식힌 뒤 다시 시도해 주세요."
                memory.lowMemory || memory.availMem<512L*1024*1024 -> "여유 메모리가 부족해 생성을 멈췄어요. 원본은 그대로예요."
                (battery?.getIntExtra(BatteryManager.EXTRA_LEVEL,100)?:100)<=15 && (battery?.getIntExtra(BatteryManager.EXTRA_PLUGGED,0)?:0)==0 -> "배터리가 부족해 생성을 멈췄어요."
                elapsed>600000 -> "생성 시간이 너무 길어 멈췄어요. 자동으로 다시 실행하지 않아요."
                else -> null
            }
            if(reason!=null){imageStopReason=reason;stopped.set(true);images.cancel()}
            val p=images.progress()
            imageNotice?.invoke(mapOf("kind" to "image","elapsedSeconds" to elapsed/1000,"step" to (p?.get(0)?:0),"steps" to (p?.get(1)?:0),"cancelling" to stopped.get()))
            imageHandler.postDelayed(this,1000)
        }
    }
    private val gson = Gson()
    private var chooser: ValueCallback<Array<Uri>>? = null
    private var exportReply: ((Any?, String?) -> Unit)? = null
    private val exportFile get() = File(cacheDir, "game-export.json")
    private var exportOpen = false
    private var exportHighSurrogate: Char? = null
    private val testMode by lazy { BuildConfig.DEBUG && intent.getBooleanExtra("testNotebook", false) }
    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        chooser?.onReceiveValue(uri?.takeIf { it.scheme == "content" }?.let { arrayOf(it) }); chooser = null
    }
    private val saveFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val reply = exportReply; exportReply = null
        if (uri == null) { exportFile.delete(); reply?.invoke(null, "백업 저장을 취소했어요.") }
        else worker.execute {
            try {
                check(uri.scheme == "content")
                contentResolver.openOutputStream(uri, "wt").use { output ->
                    checkNotNull(output) { "저장 위치를 열지 못했어요." }
                    exportFile.inputStream().use { it.copyTo(output) }
                }
                reply?.invoke(true, null)
            } catch (e: Exception) { reply?.invoke(null, "백업을 저장하지 못했어요. 다시 시도해 주세요.") }
            finally { exportFile.delete() }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        models = ModelFiles(File(getExternalFilesDir(null), "models"))
        ai = LocalAI(models.model, File(cacheDir, "litert").also { it.mkdirs() })
        images = LocalImage(File(getExternalFilesDir(null), "models/sd15.safetensors"))
        val root = FrameLayout(this)
        gameView = WebView(this)
        root.addView(gameView, FrameLayout.LayoutParams(-1, -1)); setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            v.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            val keyboard = insets.isVisible(WindowInsetsCompat.Type.ime())
            if (!rendererGone) gameView.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-keyboard',{detail:$keyboard}))", null)
            insets
        }
        ViewCompat.requestApplyInsets(root)
        gameView.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = true
            allowFileAccess = false; allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false); javaScriptCanOpenWindowsAutomatically = false
            mediaPlaybackRequiresUserGesture = true
            textZoom = (resources.configuration.fontScale * 100).toInt().coerceIn(50, 300)
        }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        fun resource(uri: Uri): WebResourceResponse {
            if (uri.scheme == "https" && uri.host == "appassets.androidplatform.net" && uri.port == -1) {
                // Preserve the pinned Anna import URL; only its host transport changes.
                if (uri.path == "/static/anna-apps/_sdk/latest/index.js") {
                    return WebResourceResponse("text/javascript", "utf-8", ByteArrayInputStream(
                        "export {AnnaAppRuntime} from '/assets/game/local/runtime.mjs';".toByteArray()))
                }
                loader.shouldInterceptRequest(uri)?.let { return it }
            }
            return WebResourceResponse("text/plain", "utf-8", 403, "Blocked", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }
        gameView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) = resource(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = request.url.toString().substringBefore('#') != GAME
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) offerRecovery()
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                rendererGone = true
                stopped.set(true); ai.cancel(); models.cancel(); images.cancel()
                chooser?.onReceiveValue(null); chooser = null
                root.removeView(view); view.destroy()
                offerRecovery()
                return true
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(object : ServiceWorkerClientCompat() {
                override fun shouldInterceptRequest(request: WebResourceRequest) = resource(request.url)
            })
        }
        gameView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                chooser?.onReceiveValue(null); chooser = callback
                val types = params.acceptTypes.filter { it in setOf("image/png", "image/jpeg", "image/webp", "application/json") }
                pickFile.launch(if (types.isEmpty()) arrayOf("application/json") else types.toTypedArray()); return true
            }
            override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                AlertDialog.Builder(this@GameActivity).setMessage(message).setPositiveButton("확인") { _, _ -> result.confirm() }
                    .setNegativeButton("취소") { _, _ -> result.cancel() }.setOnCancelListener { result.cancel() }.show(); return true
            }
        }
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            AlertDialog.Builder(this).setMessage("Android System WebView를 업데이트한 뒤 다시 열어 주세요.").setPositiveButton("닫기") { _, _ -> finish() }.show(); return
        }
        WebViewCompat.addWebMessageListener(gameView, "NoteBuddyNative", setOf(ORIGIN)) { _, message, origin, main, proxy ->
            if (main && origin.toString().trimEnd('/') == ORIGIN && gameView.url?.substringBefore('#') == GAME) {
                receive(message.data, proxy)
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (rendererGone) { finish(); return }
                gameView.evaluateJavascript("window.NoteBuddyBack ? window.NoteBuddyBack() : false") { handled -> if (handled != "true") finish() }
            }
        })
        gameView.loadUrl(GAME)
    }

    private fun receive(raw: String?, proxy: JavaScriptReplyProxy) {
        if (raw == null || raw.length > 6_100_000) return
        var id = ""
        fun reply(result: Any? = null, error: String? = null) {
            val response = gson.toJson(mapOf("id" to id, "result" to result, "error" to error))
            runOnUiThread { if (!isDestroyed && !rendererGone) runCatching { proxy.postMessage(response) } }
        }
        try {
            val request = JsonParser.parseString(raw).asJsonObject
            id = request.get("id").asString
            require(id.matches(Regex("[A-Za-z0-9-]{1,64}")))
            val payload = request.getAsJsonObject("payload") ?: JsonObject()
            when (request.get("action").asString) {
                "status" -> reply(mapOf("ready" to models.ready(), "hasLabPhoto" to File(filesDir, "input.png").isFile, "testMode" to testMode,
                    "imageEnabled" to BuildConfig.LOCAL_IMAGE_ENABLED,"localImageReady" to images.ready(),"textModelPresent" to models.hasCompleteLocalFile(),"busy" to busy.get(),
                    "textImageReady" to TextImageCapability.ready,"textImageBlockedReason" to TextImageCapability.reason))
                "cancel" -> {
                    val target = payload.get("target")?.asString
                    if (target == null || target == activeId) { stopped.set(true); ai.cancel(); models.cancel(); images.cancel() }
                    reply(true)
                }
                "download", "verifyModel", "complete", "generateImage", "generateTextImage" -> {
                    check(busy.compareAndSet(false, true)) { "친구가 아직 답장을 쓰고 있어요. 잠시 기다려 주세요." }
                    activeId = id; stopped.set(false)
                    val action = request.get("action").asString
                    val imageAction=action=="generateImage"||action=="generateTextImage"
                    if(imageAction||action=="complete")window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    if(imageAction){
                        images.prepare();imageActive=true;imageStarted=SystemClock.elapsedRealtime();imageStopReason=""
                        imageNotice={ data->if(!isDestroyed&&!rendererGone)runCatching {proxy.postMessage(gson.toJson(mapOf("id" to id,"progress" to data)))} }
                        imageHandler.post(imageMonitor)
                    }
                    worker.execute {
                        try {
                            if (stopped.get()) throw CancellationException()
                            if(imageAction){
                                val textRequest=if(action=="generateTextImage")TextImageRequest.parse(payload).also {TextImageCapability.requireSupported(it)} else null
                                // One worker owns both runtimes; never keep Gemma resident during SD.
                                ai.close()
                                val generated=if(textRequest!=null)images.runText(textRequest) else images.run(ImageRequest.parse(payload))
                                if(stopped.get())throw CancellationException()
                                if(BuildConfig.DEBUG)runCatching {
                                    File(getExternalFilesDir(null),"last-image-generation.json").writeText(gson.toJson(generated.filterKeys {it!="image"}))
                                }
                                reply(generated)
                            } else if (action == "download" || action == "verifyModel") {
                                val progress: (Long,String)->Unit = { bytes, phase ->
                                    val progress = gson.toJson(mapOf("id" to id, "progress" to mapOf("kind" to "download", "bytes" to bytes, "phase" to phase)))
                                    runOnUiThread { if (!isDestroyed && !rendererGone) runCatching { proxy.postMessage(progress) } }
                                }
                                if(action=="verifyModel")models.verifyExisting(progress) else models.download(progress)
                                reply(true)
                            } else {
                                check(models.ready()) { "설정에서 친구와 대화할 준비를 해 주세요." }
                                var lastUpdate = 0L
                                fun progress(phase: String, text: String? = null) {
                                    val now = System.nanoTime()
                                    if (text != null && now - lastUpdate < 100_000_000) return
                                    lastUpdate = now
                                    val data = gson.toJson(mapOf("id" to id, "progress" to mapOf("phase" to phase, "text" to text)))
                                    runOnUiThread { if (!isDestroyed && !rendererGone) runCatching { proxy.postMessage(data) } }
                                }
                                reply(complete(GameRequest.parse(payload), ::progress))
                            }
                        } catch (e: Exception) {
                            reply(error = imageStopReason.takeIf { imageAction && it.isNotEmpty() }
                                ?: if (stopped.get() || e is CancellationException) "취소했어요. 원본과 저장된 자료는 그대로예요." else e.message?.take(220) ?: "로컬 AI 요청을 완료하지 못했어요.")
                        } finally { runOnUiThread {
                            if(imageAction){
                                imageActive=false;imageNotice=null;imageHandler.removeCallbacks(imageMonitor)
                            }
                            if(imageAction||action=="complete")window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                            activeId = null; busy.set(false)
                        } }
                    }
                }
                "labPhoto" -> {
                    val file = File(filesDir, "input.png")
                    check(file.isFile && file.length() in 1..12_582_912) { "검증판 사진을 찾지 못했어요." }
                    reply("data:image/png;base64," + Base64.encodeToString(file.readBytes(), Base64.NO_WRAP))
                }
                "exportBegin" -> {
                    check(exportReply == null && !exportOpen) { "이미 백업을 저장하고 있어요." }
                    exportFile.writeBytes(ByteArray(0)); exportHighSurrogate = null; exportOpen = true; reply(true)
                }
                "exportChunk" -> {
                    check(exportOpen && exportReply == null)
                    var text = payload.get("text").asString
                    require(text.length <= 128000)
                    exportHighSurrogate?.let { text = it + text }; exportHighSurrogate = null
                    if (text.isNotEmpty() && text.last().isHighSurrogate()) { exportHighSurrogate = text.last(); text = text.dropLast(1) }
                    val bytes = text.toByteArray(Charsets.UTF_8)
                    require(exportFile.length() + bytes.size <= 55_000_000)
                    exportFile.appendBytes(bytes); reply(true)
                }
                "exportFinish" -> {
                    check(exportOpen && exportReply == null && exportHighSurrogate == null && exportFile.length() > 0)
                    exportOpen = false; exportReply = { result, error -> reply(result, error) }
                    saveFile.launch("notebuddy-backup.json")
                }
                "exportCancel" -> { if (exportReply == null) { exportFile.delete(); exportOpen = false; exportHighSurrogate = null }; reply(true) }
                else -> reply(error = "지원하지 않는 작업이에요.")
            }
        } catch (e: Exception) { reply(error = e.message?.take(220) ?: "요청 형식을 확인해 주세요.") }
    }

    private fun complete(request: GameRequest, progress: (String, String?) -> Unit): String {
        val picture = request.image?.let { data ->
            val bytes = Base64.decode(data.substringAfter(','), Base64.NO_WRAP)
            val size = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, size)
            require(size.outWidth in 1..2048 && size.outHeight in 1..2048) { "사진 크기를 줄여 주세요." }
            File(cacheDir, "game-vision.png").also { it.writeBytes(bytes) }
        }
        try {
            val history = request.messages.dropLast(1).map { if (it.role == "user") Message.user(it.text) else Message.model(it.text) }
            return ai.run(request.system, request.messages.last().text, history, picture,
                phase = { progress(it, null) }, update = { if (!request.json) progress("generating", it) },
                shouldCancel = { stopped.get() }, maxTokens = request.tokens, temperature = request.temperature).text
        } finally { picture?.delete() }
    }

    private fun offerRecovery() {
        if (isFinishing || isDestroyed || recoveryDialog?.isShowing == true) return
        recoveryDialog = AlertDialog.Builder(this)
            .setTitle("화면을 다시 열어 주세요")
            .setMessage("화면 실행이 중단됐어요. 저장된 친구와 기록은 유지돼요. 아직 저장하지 못한 작업은 다시 확인해 주세요.")
            .setPositiveButton("다시 열기") { _, _ -> recreate() }
            .setNegativeButton("닫기") { _, _ -> finish() }.setCancelable(false).show()
    }

    override fun onResume() { super.onResume(); if (::gameView.isInitialized && !rendererGone) gameView.onResume() }
    override fun onPause() { if (::gameView.isInitialized && !rendererGone) gameView.onPause(); super.onPause() }
    override fun onStop() {
        stopped.set(true); if (::ai.isInitialized) ai.cancel(); if (::models.isInitialized) models.cancel()
        if(::images.isInitialized)images.cancel()
        if (!worker.isShutdown) worker.execute { ai.close() }
        super.onStop()
    }
    override fun onDestroy() {
        imageHandler.removeCallbacks(imageMonitor)
        chooser?.onReceiveValue(null); chooser = null
        recoveryDialog?.dismiss(); recoveryDialog = null
        if (::gameView.isInitialized && !rendererGone) { gameView.stopLoading(); gameView.destroy() }
        worker.shutdown(); super.onDestroy()
    }
}
