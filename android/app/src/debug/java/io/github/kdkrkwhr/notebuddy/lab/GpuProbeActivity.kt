package io.github.kdkrkwhr.notebuddy.lab

import android.app.Activity
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Internal instrumented probe only; never a launcher or part of Anna's flow. */
class GpuProbeActivity : Activity() {
    @Volatile var foreground = false
    @Volatile var stopRequested = false
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val layout=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL }
        layout.addView(TextView(this).apply { text="GPU 합성 샘플 성능 검사 · 제품 이미지 생성 아님" })
        layout.addView(Button(this).apply { text="중단";setOnClickListener{stopRequested=true} })
        setContentView(layout)
    }
    fun keepAwake(active: Boolean) {
        if(active) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
    override fun onResume(){super.onResume();foreground=true}
    override fun onPause(){foreground=false;stopRequested=true;keepAwake(false);super.onPause()}
}
