package io.github.kdkrkwhr.notebuddy.lab

import org.junit.Assert.*
import org.junit.Test

class AppearanceTest {
    @Test fun validRecipeRoundTrips() { val a=Appearance(name="별콩이");assertEquals(a,Appearance.parse(a.json())) }
    @Test fun rejectsUnknownFields() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse(Appearance().json().dropLast(1)+",\"reward\":100}") } }
    @Test fun rejectsExecutableColor() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse(Appearance(color="javascript:alert(1)").json()) } }
    @Test fun rejectsUnsupportedLimbs() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse(Appearance(limbs=200).json()) } }
    @Test fun rejectsLongDescription() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse(Appearance(description="a".repeat(301)).json()) } }
    @Test fun rejectsMissingData() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse("{}") } }
    @Test fun rejectsBodyOutsideVocabulary() { assertThrows(IllegalArgumentException::class.java) { Appearance.parse(Appearance(body="dragon").json()) } }
}
