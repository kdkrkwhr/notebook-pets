package io.github.kdkrkwhr.notebuddy.lab

import io.github.kdkrkwhr.notebuddy.imageprobe.BackendPolicy
import io.github.kdkrkwhr.notebuddy.imageprobe.NativeImage
import org.junit.Assert.*
import org.junit.Test

class BackendPolicyTest {
    @Test fun selectsOnlyEnumeratedBackend() {
        assertEquals("GPUOpenCL", BackendPolicy.select("opencl", "opencl", "CPU\tarm64\nGPUOpenCL\tAdreno fixture\n"))
        assertEquals("CPU", BackendPolicy.select("cpu", "cpu", "CPU\tarm64\n"))
    }
    @Test fun absentGpuNeverFallsBack() {
        for (devices in listOf("", "CPU\tarm64\n", "GPUOpenCL\tone\nGPUOpenCL\ttwo\n"))
            assertThrows(IllegalStateException::class.java) { BackendPolicy.select("opencl", "opencl", devices) }
        assertThrows(IllegalStateException::class.java) { BackendPolicy.select("opencl", "cpu", "CPU\tarm64\n") }
        assertThrows(IllegalArgumentException::class.java) { BackendPolicy.select("auto", "opencl", "GPUOpenCL\tfixture\n") }
    }
    @Test fun missingAndroidLibraryIsReportedWithoutNativeCallOrFallback() {
        val status = NativeImage.status("opencl") // PC JVM cannot load the Android ELF library.
        assertFalse(status.available); assertNull(status.selected)
        assertTrue(status.error!!.startsWith("IMAGE_LIBRARY_UNAVAILABLE"))
        assertThrows(IllegalStateException::class.java) { NativeImage.requireBackend("opencl") }
    }
}
