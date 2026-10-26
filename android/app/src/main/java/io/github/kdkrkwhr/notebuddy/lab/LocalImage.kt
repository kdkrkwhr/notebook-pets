package io.github.kdkrkwhr.notebuddy.lab

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.Base64
import io.github.kdkrkwhr.notebuddy.imageprobe.NativeImage
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicBoolean

/** Owned by the same worker as LocalAI. The caller closes Gemma before run. */
class LocalImage(private val model: File) {
    companion object {
        const val BYTES=4265146304L
        const val SHA256="6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa"
    }
    private val lock=Any()
    private var handle=0L
    private val cancelled=AtomicBoolean(false)
    fun ready()=BuildConfig.LOCAL_IMAGE_ENABLED && model.isFile && model.length()==BYTES
    fun prepare(){cancelled.set(false)}
    fun cancel(){cancelled.set(true);synchronized(lock){if(handle!=0L)NativeImage.cancel(handle)}}
    fun progress():IntArray?=synchronized(lock){if(handle!=0L)NativeImage.progress(handle) else null}
    private fun checkRunning(){if(cancelled.get())throw CancellationException("생성을 취소했어요. 원본은 그대로예요.")}
    private fun verifyModel(){
        check(ready()){ "이미지 모델이 준비되지 않았어요. 원본은 그대로예요." }
        val digest=MessageDigest.getInstance("SHA-256")
        model.inputStream().use { input->val buffer=ByteArray(1024*1024);while(true){checkRunning();val n=input.read(buffer);if(n<0)break;digest.update(buffer,0,n)} }
        check(digest.digest().joinToString(""){"%02x".format(it)}==SHA256){"이미지 모델 파일 확인에 실패했어요."}
    }
    fun runText(request:TextImageRequest):Map<String,Any>{
        val started=System.nanoTime();verifyModel();checkRunning()
        val size=request.size
        val job=synchronized(lock){NativeImage.create().also {handle=it;if(cancelled.get())NativeImage.cancel(it)}}
        try {
            checkRunning()
            // Empty init pixels selects text2img. Keep the exact Anna prompt and
            // requested dimensions; do not silently downscale or add a policy.
            val seed=java.security.SecureRandom().nextInt(Int.MAX_VALUE).toLong()
            val generated=NativeImage.run(job,model.absolutePath,ByteArray(0),size,20,1f,seed,request.prompt)
            checkRunning();check(generated.size==size*size*3){"생성 이미지가 올바르지 않아요."}
            val colors=IntArray(size*size){i->(0xff shl 24) or ((generated[i*3].toInt() and 255) shl 16) or ((generated[i*3+1].toInt() and 255) shl 8) or (generated[i*3+2].toInt() and 255)}
            val bitmap=Bitmap.createBitmap(colors,size,size,Bitmap.Config.ARGB_8888)
            val png=ByteArrayOutputStream().also {check(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))}.toByteArray();bitmap.recycle()
            checkRunning();val stats=NativeImage.stats(job)
            return mapOf("image" to "data:image/png;base64,"+Base64.encodeToString(png,Base64.NO_WRAP),
                "totalWallMs" to (System.nanoTime()-started)/1_000_000,"generationMs" to stats[1],"peakRssKiB" to stats[2],
                "seed" to seed,"size" to size,"steps" to 20,"backend" to "phone_cpu","mode" to "text2img")
        }finally{synchronized(lock){NativeImage.destroy(job);handle=0}}
    }
    fun run(request:ImageRequest):Map<String,Any>{
        val started=System.nanoTime()
        verifyModel();checkRunning()
        val bytes=Base64.decode(request.image.substringAfter(','),Base64.NO_WRAP)
        val bounds=BitmapFactory.Options().apply {inJustDecodeBounds=true}
        BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
        require(bounds.outWidth in 1..2048 && bounds.outHeight in 1..2048){"그림 크기를 줄여 주세요."}
        val original=checkNotNull(BitmapFactory.decodeByteArray(bytes,0,bytes.size)){"그림을 읽지 못했어요."}
        val size=256;val resized=Bitmap.createBitmap(size,size,Bitmap.Config.ARGB_8888)
        val fit=ImageFit.contain(original.width,original.height,size)
        Canvas(resized).apply { drawColor(Color.WHITE);drawBitmap(original,null,RectF(fit[0],fit[1],fit[2],fit[3]),Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)) }
        val pixels=IntArray(size*size);resized.getPixels(pixels,0,size,0,0,size,size)
        val rgb=ByteArray(size*size*3)
        pixels.forEachIndexed {i,c->rgb[i*3]=(c shr 16).toByte();rgb[i*3+1]=(c shr 8).toByte();rgb[i*3+2]=c.toByte()}
        resized.recycle();if(original!==resized)original.recycle()
        val job=synchronized(lock){NativeImage.create().also {handle=it;if(cancelled.get())NativeImage.cancel(it)}}
        try {
            checkRunning()
            val generated=NativeImage.run(job,model.absolutePath,rgb,size,20,.4f,1026L,request.prompt)
            checkRunning();check(generated.size==rgb.size && !generated.contentEquals(rgb)){"새 이미지가 나오지 않았어요. 원본은 그대로예요."}
            val colors=IntArray(size*size){i->(0xff shl 24) or ((generated[i*3].toInt() and 255) shl 16) or ((generated[i*3+1].toInt() and 255) shl 8) or (generated[i*3+2].toInt() and 255)}
            val bitmap=Bitmap.createBitmap(colors,size,size,Bitmap.Config.ARGB_8888)
            val png=ByteArrayOutputStream().also {check(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))}.toByteArray();bitmap.recycle()
            checkRunning();val stats=NativeImage.stats(job)
            return mapOf("image" to "data:image/png;base64,"+Base64.encodeToString(png,Base64.NO_WRAP),
                "totalWallMs" to (System.nanoTime()-started)/1_000_000,"generationMs" to stats[1],"peakRssKiB" to stats[2],
                "seed" to 1026,"size" to size,"steps" to 20,"strength" to .4,"backend" to "phone_cpu","preprocessing" to "contain_white")
        }finally{synchronized(lock){NativeImage.destroy(job);handle=0}}
    }
}
