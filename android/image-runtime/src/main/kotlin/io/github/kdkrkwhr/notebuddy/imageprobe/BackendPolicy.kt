package io.github.kdkrkwhr.notebuddy.imageprobe

data class BackendStatus(val requested: String, val compiled: String?, val devices: String,
    val selected: String?, val error: String?) {
    val available get() = selected != null && error == null
}

/** Exact enumerated devices only. Never turn a missing GPU into a CPU request. */
object BackendPolicy {
    fun select(requested: String, compiled: String, devices: String): String {
        require(requested in setOf("cpu", "opencl")) { "Unsupported image backend: $requested" }
        check(compiled == requested) { "Backend build mismatch: requested=$requested compiled=$compiled" }
        val names = devices.lineSequence().map { it.substringBefore('\t').trim() }.filter { it.isNotEmpty() }.toList()
        val selected = names.singleOrNull { if (requested == "cpu") it.equals("CPU", true) else it == "GPUOpenCL" }
        return checkNotNull(selected) { "Requested $requested device unavailable or ambiguous; CPU fallback disabled" }
    }
}
