package io.github.kdkrkwhr.notebuddy.lab

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okio.Buffer
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File
import java.security.MessageDigest

class ModelFilesTest {
    @get:Rule val temp = TemporaryFolder()
    private val data = ByteArray(4096) { (it % 251).toByte() }
    private fun files(server: MockWebServer, dir: File = temp.newFolder()): ModelFiles {
        val hash = MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it) }
        return ModelFiles(dir, ModelSpec("model.litertlm",server.url("/model").toString(),data.size.toLong(),hash))
    }
    @Test fun fullDownloadVerifiesAndReuses() {
        MockWebServer().use { s ->
            s.enqueue(MockResponse().setBody(Buffer().write(data)))
            val f=files(s); assertFalse(f.ready()); f.download { _,_ -> }
            assertTrue(f.ready()); assertArrayEquals(data,f.model.readBytes())
            f.download { _,_ -> }; assertEquals(1,s.requestCount)
        }
    }
    @Test fun resumesExactRange() {
        MockWebServer().use { s ->
            s.enqueue(MockResponse().setResponseCode(206).setHeader("Content-Range","bytes 1024-4095/4096").setBody(Buffer().write(data,1024,3072)))
            val f=files(s);f.partial.writeBytes(data.copyOf(1024));f.download { _,_ -> }
            assertEquals("bytes=1024-",s.takeRequest().getHeader("Range"));assertTrue(f.ready())
        }
    }
    @Test fun ignoredRangeReplacesInsteadOfAppending() {
        MockWebServer().use { s ->
            s.enqueue(MockResponse().setBody(Buffer().write(data)))
            val f=files(s);f.partial.writeBytes(data.copyOf(1024));f.download { _,_ -> }
            assertArrayEquals(data,f.model.readBytes());assertTrue(f.ready())
        }
    }
    @Test fun wrongRangePreservesPartial() {
        MockWebServer().use { s ->
            s.enqueue(MockResponse().setResponseCode(206).setHeader("Content-Range","bytes 0-3071/4096").setBody(Buffer().write(data,0,3072)))
            val f=files(s);f.partial.writeBytes(data.copyOf(1024))
            assertThrows(IllegalArgumentException::class.java) { f.download { _,_ -> } }
            assertEquals(1024L,f.partial.length());assertFalse(f.ready())
        }
    }
    @Test fun corruptModelRemovedAndNeverTrusted() {
        MockWebServer().use { s ->
            val bad=data.copyOf();bad[80]=99;s.enqueue(MockResponse().setBody(Buffer().write(bad)))
            val f=files(s)
            assertThrows(java.io.IOException::class.java) { f.download { _,_ -> } }
            assertFalse(f.ready());assertFalse(f.partial.exists());assertFalse(f.model.exists())
        }
    }
    @Test fun existingCompleteFileStillRequiresHash() {
        MockWebServer().use { s ->
            val f=files(s);f.partial.writeBytes(data);assertFalse(f.ready());f.download { _,_ -> }
            assertTrue(f.ready());assertEquals(0,s.requestCount)
        }
    }
    @Test fun cancellingVerificationRetainsResumableFile() {
        MockWebServer().use { s ->
            val f=files(s);f.partial.writeBytes(data)
            assertThrows(java.util.concurrent.CancellationException::class.java) { f.download { _,_ -> f.cancel() } }
            assertFalse(f.ready());assertEquals(4096L,f.partial.length())
            f.download { _,_ -> };assertTrue(f.ready())
        }
    }
    @Test fun modelDeletionDoesNotDeleteArtwork() {
        MockWebServer().use { s ->
            val directory=temp.newFolder();val art=File(directory,"pet.png").apply { writeText("my pet") }
            val f=files(s,directory);f.partial.writeBytes(data);f.download { _,_ -> };f.delete()
            assertFalse(f.ready());assertEquals("my pet",art.readText())
        }
    }
}
