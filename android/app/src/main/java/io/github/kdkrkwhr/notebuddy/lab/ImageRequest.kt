package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.JsonObject

data class ImageRequest(val image: String, val prompt: String) {
    companion object {
        fun parse(value: JsonObject): ImageRequest {
            val image=value.get("image")?.asString ?: error("원본 그림이 필요해요.")
            require(image.length in 30..6_000_000 && image.matches(Regex("data:image/png;base64,[A-Za-z0-9+/=]+"))) { "PNG 그림을 다시 선택해 주세요." }
            val prompt=value.get("prompt")?.asString ?: error("그림 특징을 먼저 확인해 주세요.")
            require(prompt.isNotBlank() && prompt.toByteArray(Charsets.UTF_8).size<=8192 && prompt.none { it.code<32 && it!='\n' }) { "그림 특징을 다시 확인해 주세요." }
            return ImageRequest(image,prompt)
        }
    }
}
