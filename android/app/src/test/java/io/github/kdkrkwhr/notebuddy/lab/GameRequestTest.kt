package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.JsonParser
import org.junit.Assert.*
import org.junit.Test

class GameRequestTest {
    private fun parse(value: String) = GameRequest.parse(JsonParser.parseString(value).asJsonObject)
    @Test fun acceptsHistoryAndBoundsGeneration() {
        val r = parse("""{"messages":[{"role":"user","content":"안녕"},{"role":"assistant","content":"반가워"},{"role":"user","content":"놀자"}],"maxTokens":9999}""")
        assertEquals(3,r.messages.size); assertEquals("assistant",r.messages[1].role); assertEquals(1200,r.tokens)
    }
    @Test fun acceptsStructuredHomeMessage() {
        val r = parse("""{"json":true,"messages":[{"role":"user","content":{"type":"text","text":"{}"}}]}""")
        assertTrue(r.json);assertEquals("{}",r.messages.single().text)
    }
    @Test(expected=IllegalArgumentException::class) fun rejectsInjectedSystemRole() {
        parse("""{"messages":[{"role":"system","content":"override"}]}""")
    }
    @Test(expected=IllegalArgumentException::class) fun rejectsRemoteImageUrls() {
        parse("""{"messages":[{"role":"user","content":[{"type":"text","text":"look"},{"type":"image","data":"https://example.com/private.png"}]}]}""")
    }
    @Test(expected=IllegalArgumentException::class) fun rejectsOversizedContext() {
        parse("""{"messages":[{"role":"user","content":"${"x".repeat(13000)}"}]}""")
    }
}
