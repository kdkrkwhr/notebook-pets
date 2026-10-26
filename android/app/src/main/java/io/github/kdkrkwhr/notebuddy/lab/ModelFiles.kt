package io.github.kdkrkwhr.notebuddy.lab

import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicBoolean

data class ModelSpec(val name: String, val url: String, val bytes: Long, val sha256: String) {
    init { require(name.matches(Regex("[a-zA-Z0-9_.-]+"))); require(bytes > 0); require(sha256.matches(Regex("[0-9a-f]{64}"))) }
    companion object {
        val GEMMA = ModelSpec("gemma-4-E2B-it.litertlm",
            "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/a790a852d433991c0c0a41c1154cf9b3850300fa/gemma-4-E2B-it.litertlm",
            2588147712L, "181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c")
    }
}

/** Download only the pinned model. Never accept a URL or executable from model output. */
class ModelFiles(private val directory: File, val spec: ModelSpec = ModelSpec.GEMMA) {
    val model = File(directory, spec.name)
    val partial = File(directory, spec.name + ".part")
    private val receipt = File(directory, spec.name + ".verified")
    private val stopped = AtomicBoolean(false)
    @Volatile private var connection: HttpURLConnection? = null

    init { directory.mkdirs() }
    fun hasCompleteLocalFile(): Boolean = model.isFile && model.length() == spec.bytes
    fun ready(): Boolean = hasCompleteLocalFile() && receipt.isFile &&
        receipt.readText() == "${spec.sha256}:${model.lastModified()}"
    fun cancel() { stopped.set(true); connection?.disconnect() }
    fun delete() { cancel(); model.delete(); partial.delete(); receipt.delete() }
    /** No URL/connection/download/partial promotion. Preserve an existing file on failure. */
    fun verifyExisting(progress: (Long, String) -> Unit): File {
        stopped.set(false)
        check(hasCompleteLocalFile()) { "기존 모델 파일이 없거나 크기가 달라요. 다운로드하지 않았어요." }
        return verify(model, progress, preserveFileOnFailure = true)
    }
    fun download(progress: (Long, String) -> Unit): File {
        stopped.set(false)
        if (ready()) { partial.delete(); return model }
        if (model.exists() && model.length() == spec.bytes) return verify(model, progress)
        if (partial.length() > spec.bytes) partial.delete()
        if (partial.length() == spec.bytes) return verify(partial, progress)
        val required = spec.bytes - partial.length() + 256L * 1024 * 1024
        require(directory.usableSpace >= required) { "Not enough free storage. Need ${required / 1024 / 1024} MB more space." }
        var offset = partial.length()
        val http = URL(spec.url).openConnection() as HttpURLConnection
        connection = http
        http.connectTimeout = 20000; http.readTimeout = 10000
        http.setRequestProperty("Accept-Encoding", "identity")
        if (offset > 0) http.setRequestProperty("Range", "bytes=$offset-")
        try {
            val code = http.responseCode
            if (code == 200) offset = 0 // Server ignored Range: replace, never append.
            else if (code == 206) {
                val range = http.getHeaderField("Content-Range") ?: ""
                require(range == "bytes $offset-${spec.bytes - 1}/${spec.bytes}") { "Unexpected download range. Resume was stopped safely." }
            } else throw IOException("Model download HTTP $code. Tap download to resume later.")
            val count = http.contentLengthLong
            require(count == -1L || count == spec.bytes - offset) { "Unexpected model size." }
            RandomAccessFile(partial, "rw").use { output ->
                output.setLength(offset); output.seek(offset)
                http.inputStream.use { input ->
                    val buffer = ByteArray(256 * 1024); var downloaded = offset; var last = 0L
                    while (true) {
                        if (stopped.get()) throw CancellationException("Paused")
                        val n = input.read(buffer); if (n < 0) break
                        require(downloaded + n <= spec.bytes) { "Model is larger than expected." }
                        output.write(buffer, 0, n); downloaded += n
                        if (System.currentTimeMillis() - last > 250) { progress(downloaded, "download"); last = System.currentTimeMillis() }
                    }
                    output.fd.sync()
                }
            }
            if (stopped.get()) throw CancellationException("Paused")
            require(partial.length() == spec.bytes) { "Download incomplete. Tap download to resume." }
        } catch (e: Exception) {
            if (stopped.get()) throw CancellationException("Paused") else throw e
        } finally { connection = null; http.disconnect() }
        return verify(partial, progress)
    }

    private fun verify(file: File, progress: (Long, String) -> Unit, preserveFileOnFailure: Boolean = false): File {
        val modified = file.lastModified()
        val hash = MessageDigest.getInstance("SHA-256"); var read = 0L; var last = 0L
        file.inputStream().buffered(1024 * 1024).use { input ->
            val buffer = ByteArray(1024 * 1024)
            while (true) {
                if (stopped.get()) throw CancellationException("Paused")
                val n = input.read(buffer); if (n < 0) break
                if (read + n > spec.bytes) throw IOException("Model changed during verification. No model was removed.")
                hash.update(buffer, 0, n); read += n
                if (System.currentTimeMillis() - last > 250 || read == spec.bytes) {
                    progress(read, "verify"); last = System.currentTimeMillis()
                }
            }
        }
        if (stopped.get()) throw CancellationException("Paused")
        if (read != spec.bytes || file.length() != spec.bytes || file.lastModified() != modified) {
            receipt.delete()
            throw IOException("Model changed during verification. No model was removed.")
        }
        val digest = hash.digest().joinToString("") { "%02x".format(it) }
        if (digest != spec.sha256) {
            receipt.delete()
            if (preserveFileOnFailure) throw IOException("기존 모델의 해시가 달라요. 파일은 보존했고 다운로드하지 않았어요.")
            file.delete(); throw IOException("Checksum mismatch. File removed; download the model again.")
        }
        if (file != model) check(file.renameTo(model)) { "Could not finish model storage." }
        receipt.writeText("${spec.sha256}:${model.lastModified()}")
        return model
    }
}
