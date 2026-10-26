package io.github.kdkrkwhr.notebuddy.imageprobe

/** Shared Android JNI. No downloads/network. Keep handles alive until the worker returns. */
object NativeImage {
    private val loadError: String? = try { System.loadLibrary("notebuddy_image"); null }
        catch (e: LinkageError) { "IMAGE_LIBRARY_UNAVAILABLE: ${e.message}" }
        catch (e: SecurityException) { "IMAGE_LIBRARY_UNAVAILABLE: ${e.message}" }
    private external fun nativeBackend(): String
    private external fun nativeDevices(): String
    fun status(requested: String): BackendStatus {
        if (loadError != null) return BackendStatus(requested, null, "", null, loadError)
        var compiled: String? = null
        var devices = ""
        return try {
            compiled = nativeBackend(); devices = nativeDevices()
            BackendStatus(requested, compiled, devices, BackendPolicy.select(requested, compiled, devices), null)
        } catch (e: Exception) { BackendStatus(requested, compiled, devices, null, e.message) }
          catch (e: LinkageError) { BackendStatus(requested, compiled, devices, null, "IMAGE_LIBRARY_UNAVAILABLE: ${e.message}") }
    }
    fun requireBackend(requested: String): String {
        val status = status(requested)
        check(status.available) { status.error ?: "Image backend unavailable; CPU fallback disabled" }
        return checkNotNull(status.selected)
    }
    external fun create(): Long
    fun run(handle: Long, model: String, rgb: ByteArray, size: Int, steps: Int, strength: Float, seed: Long, prompt: String, backend: String = "cpu"): ByteArray =
        nativeRun(handle, model, rgb, size, steps, strength, seed, prompt, requireBackend(backend))
    private external fun nativeRun(handle: Long, model: String, rgb: ByteArray, size: Int, steps: Int, strength: Float, seed: Long, prompt: String, device: String): ByteArray
    external fun selectedDevice(handle: Long): String
    external fun cancel(handle: Long)
    external fun progress(handle: Long): IntArray
    external fun stats(handle: Long): LongArray
    external fun destroy(handle: Long)
}
