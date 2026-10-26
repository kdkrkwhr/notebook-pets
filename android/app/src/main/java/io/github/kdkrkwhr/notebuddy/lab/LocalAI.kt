package io.github.kdkrkwhr.notebuddy.lab

import com.google.ai.edge.litertlm.*
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicBoolean

data class AIResult(val text: String, val loadMs: Long, val firstTokenMs: Long, val generationMs: Long)

/** Called on one worker thread. Cancellation signals the current native conversation. */
class LocalAI(private val model: File, private val cache: File) {
    private var engine: Engine? = null
    private var engineBackend = ""
    private val cancelled = AtomicBoolean(false)
    private val conversationLock = Any()
    private var conversation: Conversation? = null
    fun cancel() {
        cancelled.set(true)
        synchronized(conversationLock) { conversation?.let { runCatching { it.cancelProcess() } } }
    }
    fun close() { engine?.close(); engine = null; engineBackend = "" }

    fun run(system: String, prompt: String, history: List<Message> = emptyList(), image: File? = null,
            schema: String? = null, backend: String = "gpu", phase: (String) -> Unit,
            update: (String) -> Unit, shouldCancel: () -> Boolean = { false }, maxTokens: Int = if (schema == null) 200 else 450,
            temperature: Double = if (schema == null) .7 else .2): AIResult {
        cancelled.set(false)
        if (shouldCancel()) throw CancellationException("Cancelled")
        val start = System.nanoTime()
        if (engineBackend != backend) close()
        if (engine == null) {
            phase("loading")
            val next = Engine(EngineConfig(modelPath = model.absolutePath,
                backend = if (backend == "cpu") Backend.CPU(threadCount = 4) else Backend.GPU(),
                visionBackend = Backend.CPU(threadCount = 4), maxNumTokens = 4096, maxNumImages = 1,
                cacheDir = cache.absolutePath))
            try { next.initialize(); engine = next; engineBackend = backend }
            catch (e: Throwable) { runCatching { next.close() }; throw e }
        }
        if (cancelled.get() || shouldCancel()) throw CancellationException("Cancelled")
        val loaded = System.nanoTime()
        phase("generating")
        val config = ConversationConfig(systemInstruction = Contents.of(system), initialMessages = history,
            samplerConfig = SamplerConfig(topK = 40, topP = .95, temperature = temperature.coerceIn(0.0, 1.0)),
            automaticToolCalling = false, tools = emptyList(), maxOutputToken = maxTokens,
            thinkingConfig = ThinkingConfig(enableThinking = false), enableResponseFormat = schema != null)
        val active = engine!!.createConversation(config)
        synchronized(conversationLock) { conversation = active }
        var first = 0L; val reply = StringBuilder(); var failure: Throwable? = null
        val done = CountDownLatch(1)
        val contents = Contents.of(buildList {
            if (image != null) add(Content.ImageFile(image.absolutePath))
            add(Content.Text(prompt))
        })
        try {
            synchronized(conversationLock) {
            if (cancelled.get() || shouldCancel()) throw CancellationException("Cancelled")
            active.sendMessageAsync(contents, object : MessageCallback {
                override fun onMessage(message: Message) {
                    val text = message.toString()
                    if (text.isNotEmpty()) {
                        if (first == 0L) first = System.nanoTime()
                        reply.append(text); update(reply.toString())
                    }
                }
                override fun onDone() { done.countDown() }
                override fun onError(throwable: Throwable) { failure = throwable; done.countDown() }
            }, responseFormat = schema?.let { ResponseFormat.json(it) })
            }
            if (!done.await(180, TimeUnit.SECONDS)) {
                cancel()
                // Native buffers must stay alive until the cancellation callback arrives.
                done.await()
                throw IllegalStateException("AI response timed out. No automatic retry was made.")
            }
            if (cancelled.get()) throw CancellationException("Cancelled")
            failure?.let { throw it }
            require(reply.isNotBlank()) { "The model returned an empty response." }
            return AIResult(reply.toString(), (loaded-start)/1_000_000,
                if (first == 0L) 0 else (first-loaded)/1_000_000, (System.nanoTime()-loaded)/1_000_000)
        } finally {
            synchronized(conversationLock) { conversation = null; active.close() }
        }
    }
}
