package io.github.kdkrkwhr.notebuddy.imageprobe

/** Shared Android JNI. No downloads/network. Keep handles alive until the worker returns. */
object NativeImage {
    init { System.loadLibrary("notebuddy_image") }
    external fun create(): Long
    external fun run(handle: Long, model: String, rgb: ByteArray, size: Int, steps: Int, strength: Float, seed: Long, prompt: String): ByteArray
    external fun cancel(handle: Long)
    external fun progress(handle: Long): IntArray
    external fun stats(handle: Long): LongArray
    external fun destroy(handle: Long)
}
