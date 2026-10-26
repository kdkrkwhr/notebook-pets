package io.github.kdkrkwhr.notebuddy.lab

import org.junit.Assert.*
import org.junit.Test

class GpuBenchmarkPolicyTest {
    private val isolated="io.github.kdkrkwhr.notebuddy.lab.ondevice.opencl"
    @Test fun refusesProductPackageCpuUnapprovedRunAnd1024() {
        for (size in listOf(256,512)) GpuBenchmarkPolicy.requireRun(isolated,"opencl",GpuBenchmarkPolicy.authorization,size)
        for (size in listOf(128,384,1024)) assertThrows(IllegalArgumentException::class.java) {
            GpuBenchmarkPolicy.requireRun(isolated,"opencl",GpuBenchmarkPolicy.authorization,size)
        }
        assertThrows(IllegalArgumentException::class.java) { GpuBenchmarkPolicy.requireRun(isolated,"cpu",GpuBenchmarkPolicy.authorization,256) }
        assertThrows(IllegalArgumentException::class.java) { GpuBenchmarkPolicy.requireRun(isolated,"opencl",null,256) }
        assertThrows(IllegalArgumentException::class.java) { GpuBenchmarkPolicy.requireRun("io.github.kdkrkwhr.notebuddy.lab.ondevice","opencl",GpuBenchmarkPolicy.authorization,256) }
        assertFalse(TextImageCapability.ready)
    }
}
