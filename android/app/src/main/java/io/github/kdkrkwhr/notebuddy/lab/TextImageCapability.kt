package io.github.kdkrkwhr.notebuddy.lab

/** No successful phone text2img benchmark exists. Do not turn a preserved
 * 1024px contract into an unapproved, potentially unsafe CPU experiment. */
object TextImageCapability {
    const val ready = false
    const val reason = "Anna의 1024px 생성 요청은 유지돼요. 현재 CPU 모델의 이 해상도 생성은 속도·메모리 검증 전이라 실행하지 않았어요. 원본과 저장 기록은 그대로예요."
    fun requireSupported(request: TextImageRequest) {
        check(ready && request.size == 1024) { reason }
    }
}
