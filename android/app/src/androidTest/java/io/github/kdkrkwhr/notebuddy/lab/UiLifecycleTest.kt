package io.github.kdkrkwhr.notebuddy.lab

import android.widget.EditText
import android.widget.Spinner
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UiLifecycleTest {
    @Test fun recreationKeepsUnsentTextAndBackendWithoutStartingAI() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                activity.findViewById<EditText>(R.id.chat_input).setText("아직 보내지 않은 테스트 문장")
                activity.findViewById<Spinner>(R.id.backend).setSelection(1)
            }
            scenario.recreate()
            scenario.onActivity { activity ->
                assertEquals("아직 보내지 않은 테스트 문장",activity.findViewById<EditText>(R.id.chat_input).text.toString())
                assertEquals(1,activity.findViewById<Spinner>(R.id.backend).selectedItemPosition)
            }
        }
    }
}
