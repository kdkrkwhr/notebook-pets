package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.JsonParser
import org.junit.Assert.*
import org.junit.Test

class TextImageRequestTest {
 private val json="""{"prompt":"A new baby with observed features","n":1,"size":"1024x1024","quality":"low","resolution":"1K","output_format":"png"}"""
 @Test fun preservesAnnaPromptAndDimensions(){val r=TextImageRequest.parse(JsonParser.parseString(json).asJsonObject);assertEquals(1024,r.size);assertEquals("A new baby with observed features",r.prompt)}
 @Test(expected=IllegalArgumentException::class) fun rejectsHiddenImageConditioning(){val p=JsonParser.parseString(json).asJsonObject;p.addProperty("image","data:image/png;base64,AA==");TextImageRequest.parse(p)}
 @Test(expected=IllegalArgumentException::class) fun rejectsSilentDownscale(){TextImageRequest.parse(JsonParser.parseString(json.replace("1024x1024","256x256")).asJsonObject)}
 @Test(expected=IllegalStateException::class) fun blocksUnvalidatedCpu1024BeforeRuntime(){TextImageCapability.requireSupported(TextImageRequest.parse(JsonParser.parseString(json).asJsonObject))}
}
