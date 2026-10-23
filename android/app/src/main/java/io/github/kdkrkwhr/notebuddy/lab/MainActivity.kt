package io.github.kdkrkwhr.notebuddy.lab

import android.app.AlertDialog
import android.graphics.*
import android.os.Bundle
import android.text.InputFilter
import android.view.*
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val vm: LabViewModel by viewModels()
    private lateinit var column: LinearLayout
    private lateinit var status: TextView
    private lateinit var modelStatus: TextView
    private lateinit var result: TextView
    private lateinit var conversation: TextView
    private lateinit var timing: TextView
    private lateinit var pet: ImageView
    private lateinit var input: ImageView
    private lateinit var progress: ProgressBar
    private lateinit var download: Button
    private lateinit var remove: Button
    private lateinit var stop: Button
    private lateinit var analyze: Button
    private lateinit var send: Button
    private lateinit var editor: EditText
    private lateinit var backend: Spinner
    private val controls = mutableListOf<View>()
    private var lastAppearance: Appearance? = null
    private var inputVersion = -1L
    private val picker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let(vm::importPhoto) }
    private fun dp(n: Int) = (n * resources.displayMetrics.density).toInt()
    private fun label(value: String, size: Float = 15f): TextView = TextView(this).apply {
        text = value; textSize = size; setTextColor(Color.rgb(43,58,48)); setPadding(0,dp(7),0,dp(7))
        setLineSpacing(dp(2).toFloat(),1f)
    }
    private fun section(id: Int) = label(getString(id),21f).also { it.setTypeface(null,Typeface.BOLD); column.addView(it) }
    private fun button(id: Int, action: () -> Unit): Button = Button(this).apply {
        text=getString(id); isAllCaps=false; minHeight=dp(48); setOnClickListener { action() }
        column.addView(this, LinearLayout.LayoutParams(-1,-2)); controls.add(this)
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scroll=ScrollView(this).apply { id=R.id.main_scroll; isFillViewport=true; setBackgroundColor(Color.rgb(249,247,239)) }
        column=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(dp(22),dp(16),dp(22),dp(28)) }
        scroll.addView(column); setContentView(scroll)
        scroll.setOnApplyWindowInsetsListener { view, insets ->
            val bars=insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom); insets
        }
        column.addView(label("NoteBuddy",34f).apply { setTypeface(null,Typeface.BOLD) })
        column.addView(label(getString(R.string.subtitle),17f))
        column.addView(label(getString(R.string.lab_note),13f))
        section(R.string.setup)
        column.addView(label(getString(R.string.model_info)))
        modelStatus=label(""); column.addView(modelStatus)
        progress=ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal).apply { max=100 }
        column.addView(progress, LinearLayout.LayoutParams(-1,dp(6)))
        download=button(R.string.download) {
            AlertDialog.Builder(this).setMessage(R.string.confirm_download)
                .setPositiveButton(R.string.download) { _,_ -> vm.download() }.setNegativeButton(R.string.cancel,null).show()
        }; download.contentDescription="download_model"
        remove=button(R.string.delete_model) {
            AlertDialog.Builder(this).setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete_model) { _,_ -> vm.deleteModel() }.setNegativeButton(R.string.cancel,null).show()
        }
        column.addView(label(getString(R.string.backend),13f))
        backend=Spinner(this).apply { id=R.id.backend; adapter=ArrayAdapter(this@MainActivity,android.R.layout.simple_spinner_dropdown_item,listOf("GPU","CPU")); minimumHeight=dp(48) }
        column.addView(backend); controls.add(backend)
        status=label(""); status.accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE; column.addView(status)
        stop=button(R.string.stop) { vm.cancel() }
        section(R.string.companion)
        column.addView(label(getString(R.string.art_note)))
        input=ImageView(this).apply { contentDescription=getString(R.string.input_picture); scaleType=ImageView.ScaleType.FIT_CENTER; setBackgroundColor(Color.WHITE) }
        column.addView(input, LinearLayout.LayoutParams(-1,dp(150)))
        button(R.string.draw) { drawingDialog() }
        button(R.string.photo) { picker.launch("image/*") }
        analyze=button(R.string.analyze) { vm.analyze(selectedBackend()) }; analyze.contentDescription="analyze_picture"
        pet=ImageView(this).apply { contentDescription=getString(R.string.pet_picture); scaleType=ImageView.ScaleType.FIT_CENTER }
        column.addView(pet,LinearLayout.LayoutParams(-1,dp(230)))
        result=label("",17f); column.addView(result)
        section(R.string.chat)
        conversation=label(""); conversation.setTextIsSelectable(true); column.addView(conversation)
        editor=EditText(this).apply { id=R.id.chat_input; hint=getString(R.string.chat_hint); maxLines=4; minLines=2; filters=arrayOf(InputFilter.LengthFilter(500)); setTextColor(Color.rgb(43,58,48)); contentDescription="chat_input" }
        column.addView(editor); controls.add(editor)
        send=button(R.string.send) { val text=editor.text.toString(); if(text.isNotBlank()) { vm.chat(text,selectedBackend()); editor.text.clear() } }; send.contentDescription="send_chat"
        button(R.string.clear_chat) { vm.clearChat() }
        timing=label("",12f); column.addView(timing)
        column.addView(label(getString(R.string.privacy),13f))
        vm.state.observe(this) { s ->
            controls.forEach { it.isEnabled=!s.busy }
            stop.isEnabled=s.busy; stop.visibility=if(s.busy) View.VISIBLE else View.GONE
            download.isEnabled=!s.busy && !s.ready
            remove.isEnabled=!s.busy && (s.ready || vm.models.partial.exists() || vm.models.model.exists())
            analyze.isEnabled=!s.busy && s.ready && s.input!=null
            send.isEnabled=!s.busy && s.ready
            modelStatus.text=if(s.ready) getString(R.string.ready) else "Gemma 4 E2B · ${s.progress}%"
            progress.visibility=if(s.phase in setOf("download","verify")) View.VISIBLE else View.GONE; progress.progress=s.progress
            status.text=if(s.error.isNotEmpty()) s.error else getString(when(s.phase) {
                "loading"->R.string.loading; "generating"->R.string.generating; "verify"->R.string.verifying
                "download"->R.string.downloading; "paused"->R.string.paused; "idle"->R.string.idle; else->R.string.working })
            status.setTextColor(if(s.error.isEmpty()) Color.rgb(43,95,72) else Color.rgb(170,45,35))
            if(lastAppearance!=s.appearance) { pet.setImageBitmap(CharacterArt.draw(s.appearance)); lastAppearance=s.appearance }
            result.text="${s.appearance.name}\n${s.appearance.description}\n${s.appearance.personality}"
            input.visibility=if(s.input==null) View.GONE else View.VISIBLE
            val stamp=s.input?.lastModified() ?: 0L
            if(stamp!=inputVersion) { input.setImageBitmap(s.input?.let { BitmapFactory.decodeFile(it.absolutePath) }); inputVersion=stamp }
            conversation.text=(s.turns.map { "You: ${it.user}\n${s.appearance.name}: ${it.reply}" } + listOfNotNull(s.partial.takeIf { it.isNotEmpty() }?.let { "${s.appearance.name}: $it" }))
                .joinToString("\n\n").ifBlank { getString(R.string.chat_empty) }
            timing.text=s.metrics?.let { getString(R.string.timing,it.loadMs/1000.0,it.firstTokenMs/1000.0,it.generationMs/1000.0) } ?: ""
            if(s.busy) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
    private fun selectedBackend() = backend.selectedItem.toString().lowercase(Locale.ROOT)
    override fun onStop() { super.onStop(); if(!isChangingConfigurations) vm.background() }
    private fun drawingDialog() {
        val pad=DrawingPad(this)
        val layout=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(dp(12),dp(12),dp(12),0) }
        val colors=LinearLayout(this)
        listOf(0xff355e4c.toInt(),0xff7cc6ad.toInt(),0xffe0a840.toInt()).forEach { color ->
            colors.addView(Button(this).apply { text="●"; textSize=24f; setTextColor(color); contentDescription="Pen color"; setOnClickListener { pad.ink.color=color } },LinearLayout.LayoutParams(0,dp(52),1f))
        }
        layout.addView(colors);layout.addView(pad,LinearLayout.LayoutParams(-1,dp(300)))
        AlertDialog.Builder(this).setTitle(R.string.draw).setView(layout)
            .setPositiveButton(R.string.use_drawing) { _,_ -> vm.drawing(pad.snapshot()) }
            .setNegativeButton(R.string.cancel,null).setNeutralButton(R.string.clear,null).create().also { dialog ->
                dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener { pad.clear() } }; dialog.show()
            }
    }
}

private class DrawingPad(context: android.content.Context) : View(context) {
    private val bitmap=Bitmap.createBitmap(512,512,Bitmap.Config.ARGB_8888).apply { eraseColor(Color.WHITE) }
    private val canvas=Canvas(bitmap)
    private val bounds=Rect()
    val ink=Paint(Paint.ANTI_ALIAS_FLAG).apply { color=0xff355e4c.toInt();strokeWidth=12f;strokeCap=Paint.Cap.ROUND;strokeJoin=Paint.Join.ROUND }
    private var x=0f; private var y=0f
    fun clear() { bitmap.eraseColor(Color.WHITE);invalidate() }
    fun snapshot(): Bitmap = bitmap.copy(Bitmap.Config.ARGB_8888,false)
    override fun onSizeChanged(w: Int,h: Int,oldw: Int,oldh: Int) { bounds.set(0,0,w,h) }
    override fun onDraw(c: Canvas) { c.drawBitmap(bitmap,null,bounds,null) }
    override fun performClick(): Boolean { super.performClick();return true }
    override fun onTouchEvent(e: MotionEvent): Boolean {
        val nx=e.x*512/width;val ny=e.y*512/height
        when(e.actionMasked) {
            MotionEvent.ACTION_DOWN -> { parent.requestDisallowInterceptTouchEvent(true);x=nx;y=ny;canvas.drawPoint(x,y,ink) }
            MotionEvent.ACTION_MOVE -> { canvas.drawLine(x,y,nx,ny,ink);x=nx;y=ny }
            MotionEvent.ACTION_UP -> { performClick();parent.requestDisallowInterceptTouchEvent(false) }
        };invalidate();return true
    }
}
