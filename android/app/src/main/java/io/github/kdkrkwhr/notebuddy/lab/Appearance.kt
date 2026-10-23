package io.github.kdkrkwhr.notebuddy.lab

import com.google.gson.Gson
import com.google.gson.JsonParser

/** Small validated drawing vocabulary. No arbitrary SVG, scripts or game-state mutations. */
data class Appearance(
    val name: String = "Buddy", val description: String = "A curious mint friend",
    val body: String = "round", val color: String = "#7CC6AD", val accent: String = "#FFF0CB",
    val ears: String = "pointed", val limbs: Int = 2, val tail: Boolean = true,
    val accessory: String = "scarf", val personality: String = "curious and kind"
) {
    fun json(): String = Gson().toJson(this)
    companion object {
        val schema = """{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string"},"description":{"type":"string"},"body":{"type":"string","enum":["round","long","ghost"]},"color":{"type":"string","pattern":"^#[0-9A-Fa-f]{6}$"},"accent":{"type":"string","pattern":"^#[0-9A-Fa-f]{6}$"},"ears":{"type":"string","enum":["pointed","round","none"]},"limbs":{"type":"integer","enum":[0,2,4]},"tail":{"type":"boolean"},"accessory":{"type":"string","enum":["scarf","star","leaf","none"]},"personality":{"type":"string"}},"required":["name","description","body","color","accent","ears","limbs","tail","accessory","personality"]}"""
        fun parse(text: String): Appearance {
            require(text.length <= 8000) { "Appearance response is too large." }
            val json = JsonParser.parseString(text.trim().removePrefix("```json").removePrefix("```").removeSuffix("```").trim()).asJsonObject
            require(json.keySet() == setOf("name","description","body","color","accent","ears","limbs","tail","accessory","personality")) { "Incomplete appearance response." }
            fun string(key: String, max: Int): String {
                require(json[key].isJsonPrimitive && json[key].asJsonPrimitive.isString)
                return json[key].asString.also { require(it.isNotBlank() && it.length <= max && it.none { c -> c.code < 32 }) }
            }
            val limbs = json["limbs"]
            require(limbs.isJsonPrimitive && limbs.asJsonPrimitive.isNumber && limbs.asString in setOf("0","2","4"))
            require(json["tail"].isJsonPrimitive && json["tail"].asJsonPrimitive.isBoolean)
            return Appearance(string("name",30),string("description",300),string("body",10),string("color",7),
                string("accent",7),string("ears",10),limbs.asInt,json["tail"].asBoolean,string("accessory",10),string("personality",180)).also {
                require(it.body in setOf("round","long","ghost")); require(it.ears in setOf("pointed","round","none"))
                require(it.accessory in setOf("scarf","star","leaf","none"))
                require(it.color.matches(Regex("#[0-9A-Fa-f]{6}")) && it.accent.matches(Regex("#[0-9A-Fa-f]{6}")))
            }
        }
    }
}
