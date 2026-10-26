package io.github.kdkrkwhr.notebuddy.lab

/** Internal synthetic feasibility inputs, never a replacement for Anna's 1024px request. */
object GpuBenchmarkPolicy {
    const val authorization = "synthetic-gpu-benchmark"
    const val steps = 12
    const val seed = 1026L
    const val maxWallMs = 300_000L
    const val prompt = "A small friendly green creature with two triangular ears, large eyes, two feet and a red diamond on its belly, painted game character, plain white background."
    fun requireRun(packageName: String, backend: String, grant: String?, size: Int) {
        require(packageName.endsWith(".lab.ondevice.opencl")) { "Isolated GPU test package required" }
        require(backend == "opencl") { "GPU benchmark must not run on CPU" }
        require(grant == authorization) { "Separate explicit benchmark authorization required" }
        require(size == 256 || size == 512) { "Only internal 256/512 probes; 1024 product generation stays blocked" }
    }
}
