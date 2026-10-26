package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.JsonObject

/** The public Anna request contract. No input bitmap or img2img strength. */
data class TextImageRequest(val prompt: String, val size: Int) {
    companion object {
        fun parse(value: JsonObject): TextImageRequest {
            require(value.keySet().all { it in setOf("prompt","n","size","quality","resolution","output_format") }) { "지원하지 않는 이미지 요청이에요." }
            val prompt=value.get("prompt")?.asString ?: error("이미지 설명이 필요해요.")
            require(prompt.isNotBlank() && prompt.toByteArray(Charsets.UTF_8).size<=8192 && prompt.none { it.code<32 && it!='\n' })
            require(value.get("n")?.asInt==1 && value.get("size")?.asString=="1024x1024" &&
                value.get("quality")?.asString=="low" && value.get("resolution")?.asString=="1K" &&
                value.get("output_format")?.asString=="png") { "Anna 이미지 요청 설정을 로컬 모델에서 확인할 수 없어요." }
            return TextImageRequest(prompt,1024)
        }
    }
}
