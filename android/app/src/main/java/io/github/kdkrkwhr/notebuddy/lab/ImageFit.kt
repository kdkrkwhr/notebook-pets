package io.github.kdkrkwhr.notebuddy.lab

/** Centered contain rectangle: no stretch, cropping or inferred missing anatomy. */
object ImageFit {
    fun contain(width:Int,height:Int,size:Int):FloatArray {
        require(width>0 && height>0 && size>0)
        val scale=minOf(size.toFloat()/width,size.toFloat()/height)
        val w=width*scale;val h=height*scale
        return floatArrayOf((size-w)/2,(size-h)/2,(size+w)/2,(size+h)/2)
    }
}
