package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.JsonObject

data class GameMessage(val role: String, val text: String)
data class GameRequest(val system: String, val messages: List<GameMessage>, val image: String?, val json: Boolean, val tokens: Int) {
    companion object {
        fun parse(value: JsonObject): GameRequest {
            val system = value.get("systemPrompt")?.asString ?: "Reply briefly in Korean."
            require(system.length <= 5000) { "AI 지시문이 너무 길어요." }
            val source = value.getAsJsonArray("messages") ?: error("대화 내용이 없어요.")
            require(source.size() in 1..10) { "최근 대화가 너무 길어요." }
            var image: String? = null
            val messages = source.map { item ->
                val m = item.asJsonObject
                val role = m.get("role")?.asString
                require(role == "user" || role == "assistant") { "지원하지 않는 대화 역할이에요." }
                val content = m.get("content") ?: error("대화 내용이 없어요.")
                val text = if (content.isJsonPrimitive) content.asString else {
                    val blocks = if (content.isJsonArray) content.asJsonArray.toList() else listOf(content)
                    require(blocks.size <= 4)
                    blocks.mapNotNull { block ->
                        val b = block.asJsonObject
                        when (b.get("type")?.asString) {
                            "text" -> b.get("text")?.asString ?: ""
                            "image" -> {
                                require(role == "user" && image == null) { "사진은 한 장만 사용할 수 있어요." }
                                val data = b.get("data")?.asString ?: error("사진이 없어요.")
                                require(data.length <= 6_000_000 && data.matches(Regex("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+"))) { "지원하지 않는 사진 형식이에요." }
                                image = data; null
                            }
                            else -> error("지원하지 않는 AI 입력이에요.")
                        }
                    }.joinToString("\n")
                }
                GameMessage(role, text)
            }
            require(messages.last().role == "user" && messages.last().text.isNotBlank()) { "메시지를 입력해 주세요." }
            require(system.length + messages.sumOf { it.text.length } <= 12000) { "이번 요청은 로컬 모델에 너무 길어요. 짧게 입력해 주세요." }
            val json = value.get("json")?.asBoolean ?: false
            return GameRequest(system, messages, image, json, (value.get("maxTokens")?.asInt ?: 300).coerceIn(64, 1200))
        }
    }
}
