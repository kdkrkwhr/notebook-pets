package io.github.kdkrkwhr.notebuddy.lab
import org.junit.Assert.*
import org.junit.Test
class ImageFitTest {
    @Test fun preservesLandscapePortraitAndSquare(){
        assertArrayEquals(floatArrayOf(0f,64f,256f,192f),ImageFit.contain(800,400,256),.001f)
        assertArrayEquals(floatArrayOf(64f,0f,192f,256f),ImageFit.contain(400,800,256),.001f)
        assertArrayEquals(floatArrayOf(0f,0f,256f,256f),ImageFit.contain(512,512,256),.001f)
    }
    @Test(expected=IllegalArgumentException::class) fun rejectsEmptyInput(){ImageFit.contain(0,300,256)}
}
