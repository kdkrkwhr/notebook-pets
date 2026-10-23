package io.github.kdkrkwhr.notebuddy.lab

import android.graphics.*

/** Deterministic local illustration, selected by the model's validated appearance description. */
object CharacterArt {
    fun draw(a: Appearance): Bitmap {
        val bitmap = Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888)
        val c = Canvas(bitmap); val p = Paint(Paint.ANTI_ALIAS_FLAG)
        val coat = Color.parseColor(a.color); val accent = Color.parseColor(a.accent)
        fun oval(l: Float,t: Float,r: Float,b: Float,color: Int) { p.color=color; c.drawOval(l,t,r,b,p) }
        fun shape(color: Int, vararg points: Float) {
            p.color=color; val path=Path(); path.moveTo(points[0],points[1]);
            for (i in 2 until points.size step 2) path.lineTo(points[i],points[i+1]); path.close(); c.drawPath(path,p)
        }
        if (a.tail) { oval(332f,258f,455f,397f,coat); oval(370f,268f,444f,330f,accent) }
        if (a.limbs > 0) {
            oval(170f,363f,230f,430f,coat); oval(277f,363f,337f,430f,coat)
            oval(168f,407f,232f,435f,accent); oval(275f,407f,340f,435f,accent)
        }
        if (a.body == "ghost") shape(coat,148f,300f,364f,300f,377f,422f,336f,398f,298f,425f,256f,398f,215f,425f,176f,398f,136f,422f)
        oval(if(a.body=="long") 185f else 153f,220f,if(a.body=="long")327f else 359f,409f,coat)
        oval(196f,282f,316f,396f,accent)
        if(a.limbs == 4) { oval(135f,286f,192f,352f,coat); oval(321f,286f,377f,352f,coat) }
        if(a.ears == "pointed") {
            shape(coat,150f,175f,137f,66f,220f,134f); shape(coat,292f,134f,375f,66f,362f,175f)
            shape(accent,163f,147f,155f,99f,197f,137f); shape(accent,315f,137f,357f,99f,349f,147f)
        } else if(a.ears == "round") { oval(126f,91f,218f,191f,coat); oval(294f,91f,386f,191f,coat) }
        oval(139f,119f,373f,301f,coat)
        oval(197f,232f,315f,291f,accent)
        oval(191f,187f,225f,227f,Color.WHITE); oval(287f,187f,321f,227f,Color.WHITE)
        oval(202f,196f,222f,222f,Color.rgb(48,49,42)); oval(290f,196f,310f,222f,Color.rgb(48,49,42))
        oval(202f,197f,209f,204f,Color.WHITE); oval(290f,197f,297f,204f,Color.WHITE)
        oval(246f,241f,266f,255f,Color.rgb(65,57,48))
        p.color=Color.rgb(65,57,48);p.style=Paint.Style.STROKE;p.strokeWidth=4f
        c.drawArc(238f,251f,274f,274f,0f,180f,false,p);p.style=Paint.Style.FILL
        when(a.accessory) {
            "scarf" -> {p.color=Color.rgb(49,67,99);c.drawRoundRect(157f,279f,356f,310f,16f,16f,p);shape(p.color,293f,303f,328f,303f,353f,365f,317f,351f)}
            "leaf" -> {oval(241f,85f,272f,141f,Color.rgb(75,121,60));oval(265f,95f,305f,123f,Color.rgb(108,146,75))}
        }
        if(a.accessory in setOf("star","scarf")) {
            val x=if(a.accessory=="star")256f else 307f;val y=if(a.accessory=="star")330f else 294f
            val path=Path()
            for(i in 0..9) { val angle=(i*36-90)*Math.PI/180; val radius=if(i%2==0)17 else 8
                val px=x+(kotlin.math.cos(angle)*radius).toFloat();val py=y+(kotlin.math.sin(angle)*radius).toFloat()
                if(i==0)path.moveTo(px,py)else path.lineTo(px,py)
            };path.close();p.color=Color.rgb(241,190,68);c.drawPath(path,p)
        }
        return bitmap
    }
}
