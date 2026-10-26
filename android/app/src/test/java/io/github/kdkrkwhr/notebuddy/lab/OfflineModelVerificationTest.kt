package io.github.kdkrkwhr.notebuddy.lab

import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.CancellationException
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** Tiny local fixtures with an unusable URL: no HTTP server or weight download. */
class OfflineModelVerificationTest {
    @get:Rule val temp=TemporaryFolder()
    private val data=ByteArray(4096){(it%251).toByte()}
    private fun files():ModelFiles {
        val hash=MessageDigest.getInstance("SHA-256").digest(data).joinToString(""){"%02x".format(it)}
        return ModelFiles(temp.newFolder(),ModelSpec("existing.litertlm","unsupported-offline://never",data.size.toLong(),hash))
    }
    @Test fun existingFileBecomesReadyWithoutUsableNetworkUrl(){
        val f=files();f.model.writeBytes(data);val before=f.model.lastModified()
        assertTrue(f.hasCompleteLocalFile());assertFalse(f.ready());f.verifyExisting{_,phase->assertEquals("verify",phase)}
        assertTrue(f.ready());assertArrayEquals(data,f.model.readBytes());assertEquals(before,f.model.lastModified())
    }
    @Test fun missingFileDoesNotPromotePartialOrDownload(){
        val f=files();f.partial.writeBytes(data)
        assertThrows(IllegalStateException::class.java){f.verifyExisting{_,_->}}
        assertFalse(f.model.exists());assertArrayEquals(data,f.partial.readBytes());assertFalse(f.ready())
    }
    @Test fun wrongSizeRetainsEveryExistingByte(){
        val f=files();val short=data.copyOf(100);f.model.writeBytes(short)
        assertThrows(IllegalStateException::class.java){f.verifyExisting{_,_->}}
        assertArrayEquals(short,f.model.readBytes());assertFalse(f.ready())
    }
    @Test fun badHashPreservesModelAndArtworkButInvalidatesReceipt(){
        val f=files();val bad=data.copyOf().also{it[10]=99};f.model.writeBytes(bad)
        val art=File(f.model.parentFile,"art.png").apply{writeText("preserve")}
        File(f.model.parentFile,f.spec.name+".verified").writeText("${f.spec.sha256}:${f.model.lastModified()}")
        assertThrows(IOException::class.java){f.verifyExisting{_,_->}}
        assertArrayEquals(bad,f.model.readBytes());assertEquals("preserve",art.readText());assertFalse(f.ready())
    }
    @Test fun cancellationPreservesModelAndDoesNotMarkReady(){
        val f=files();f.model.writeBytes(data)
        assertThrows(CancellationException::class.java){f.verifyExisting{_,_->f.cancel()}}
        assertArrayEquals(data,f.model.readBytes());assertFalse(f.ready())
        f.verifyExisting{_,_->};assertTrue(f.ready())
    }
    @Test fun fileChangedDuringVerificationIsNotTrusted(){
        val f=files();f.model.writeBytes(data)
        assertThrows(IOException::class.java){f.verifyExisting{_,_->f.model.appendBytes(byteArrayOf(3))}}
        assertEquals(data.size.toLong()+1,f.model.length());assertFalse(f.ready())
    }
}
