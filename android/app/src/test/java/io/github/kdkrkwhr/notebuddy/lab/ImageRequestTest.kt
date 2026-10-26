package io.github.kdkrkwhr.notebuddy.lab
import com.google.gson.JsonObject
import org.junit.Assert.*
import org.junit.Test
class ImageRequestTest {
    @Test fun rejectsRemotePathMalformedAndOversizedInput(){
        for(data in listOf("https://example.com/private.png","file:///private.png","data:image/jpeg;base64,"+"A".repeat(20),"data:image/png;base64,"+"A".repeat(6_000_001))){
            try{ImageRequest.parse(JsonObject().apply{addProperty("image",data)});fail("Rejected boundary input expected")}catch(expected:IllegalArgumentException){}
        }
    }
    @Test fun acceptsBoundedPngAndObservedPrompt(){val data="data:image/png;base64,"+"A".repeat(32);val req=ImageRequest.parse(JsonObject().apply{addProperty("image",data);addProperty("prompt","A legless blue companion")});assertEquals(data,req.image);assertEquals("A legless blue companion",req.prompt)}
    @Test fun requiresObservedPromptAndBoundsUtf8(){
        val value=JsonObject().apply{addProperty("image","data:image/png;base64,"+"A".repeat(32))}
        for(prompt in listOf("", "가".repeat(3000), "hello\u0000bad")){
            value.addProperty("prompt",prompt)
            try{ImageRequest.parse(value);fail("Invalid prompt accepted")}catch(expected:IllegalArgumentException){}
        }
    }
}
