#include <jni.h>
#include <atomic>
#include <chrono>
#include <mutex>
#include <string>
#include <vector>
#include <exception>
#include <android/log.h>
#include <sys/resource.h>
#include "stable-diffusion.h"

struct Job {
    std::mutex lock;
    sd_ctx_t* context = nullptr;
    std::atomic<bool> cancelled{false};
    std::atomic<int> step{0}, steps{0};
    long load_ms = 0, generate_ms = 0, peak_rss_kib = 0;
};
static std::mutex runtime_lock; // Upstream callbacks are global; serialize contexts.
struct RunCleanup {
    Job* job;
    sd_image_generation_result_t* result = nullptr;
    ~RunCleanup() {
        sd_ctx_t* context;
        { std::lock_guard<std::mutex> guard(job->lock); context=job->context; job->context=nullptr; }
        if (result) free_sd_image_generation_result(result);
        if (context) free_sd_ctx(context);
        sd_set_progress_callback(nullptr, nullptr);
    }
};
static void fail(JNIEnv* env, const char* text) {
    env->ThrowNew(env->FindClass("java/lang/IllegalStateException"), text);
}
static std::string utf(JNIEnv* env, jstring value) {
    const char* chars = env->GetStringUTFChars(value, nullptr);
    std::string result(chars);
    env->ReleaseStringUTFChars(value, chars);
    return result;
}
extern "C" JNIEXPORT jlong JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_create(JNIEnv* env, jobject) {
    try { return reinterpret_cast<jlong>(new Job()); }
    catch(const std::exception&) { fail(env, "Insufficient memory for an image request"); return 0; }
}
extern "C" JNIEXPORT void JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_cancel(JNIEnv*, jobject, jlong handle) {
    auto* job = reinterpret_cast<Job*>(handle);
    job->cancelled = true;
    std::lock_guard<std::mutex> guard(job->lock);
    if (job->context) sd_cancel_generation(job->context, SD_CANCEL_ALL);
}
extern "C" JNIEXPORT jintArray JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_progress(JNIEnv* env, jobject, jlong handle) {
    auto* job = reinterpret_cast<Job*>(handle);
    jint values[] = {job->step.load(), job->steps.load()};
    jintArray result = env->NewIntArray(2);
    env->SetIntArrayRegion(result, 0, 2, values);
    return result;
}
extern "C" JNIEXPORT jlongArray JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_stats(JNIEnv* env, jobject, jlong handle) {
    auto* job = reinterpret_cast<Job*>(handle);
    jlong values[] = {job->load_ms, job->generate_ms, job->peak_rss_kib};
    jlongArray result = env->NewLongArray(3);
    env->SetLongArrayRegion(result, 0, 3, values);
    return result;
}
extern "C" JNIEXPORT void JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_destroy(JNIEnv*, jobject, jlong handle) {
    // Java owns lifetime: only called after run returned, under the handle lock.
    delete reinterpret_cast<Job*>(handle);
}
extern "C" JNIEXPORT jbyteArray JNICALL
Java_io_github_kdkrkwhr_notebuddy_imageprobe_NativeImage_run(JNIEnv* env, jobject, jlong handle,
        jstring model, jbyteArray rgb, jint size, jint steps, jfloat strength, jlong seed, jstring prompt) {
    auto* job = reinterpret_cast<Job*>(handle);
    std::unique_lock<std::mutex> exclusive(runtime_lock, std::try_to_lock);
    if (!exclusive.owns_lock()) { fail(env, "A generation is already running"); return nullptr; }
    if ((size != 256 && size != 384 && size != 512) || steps < 8 || steps > 30 ||
        strength < .2f || strength > .8f || env->GetArrayLength(rgb) != size*size*3) {
        fail(env, "Invalid bounded image request"); return nullptr;
    }
    if (job->cancelled) { fail(env, "Cancelled"); return nullptr; }
    RunCleanup cleanup{job};
    try {
    auto start = std::chrono::steady_clock::now();
    const auto model_path = utf(env, model), prompt_text = utf(env, prompt);
    if (prompt_text.empty() || prompt_text.size() > 8192) { fail(env, "Prompt too long or missing"); return nullptr; }
    // The Android caller bounds input sizes and serializes text/image runtimes.
    sd_set_log_callback([](sd_log_level_t level, const char* text, void*) {
        if (level >= SD_LOG_WARN) __android_log_write(ANDROID_LOG_WARN, "NBImage", text);
    }, nullptr);
    sd_set_progress_callback([](int n, int total, float, void* data) {
        auto* j = static_cast<Job*>(data); j->step = n; j->steps = total;
    }, job);
    sd_ctx_params_t context;
    sd_ctx_params_init(&context);
    context.model_path = model_path.c_str();
    context.n_threads = 4;
    context.wtype = SD_TYPE_Q4_0;
    context.backend = "cpu";
    context.enable_mmap = true;
    context.flash_attn = true;
    sd_ctx_t* loaded = new_sd_ctx(&context);
    auto ready = std::chrono::steady_clock::now();
    job->load_ms = std::chrono::duration_cast<std::chrono::milliseconds>(ready-start).count();
    jbyteArray output = nullptr;
    {
        std::lock_guard<std::mutex> guard(job->lock);
        job->context = loaded;
        if (loaded && job->cancelled) sd_cancel_generation(loaded, SD_CANCEL_ALL);
    }
    if (loaded && !job->cancelled) {
        std::vector<uint8_t> pixels(size*size*3);
        env->GetByteArrayRegion(rgb, 0, pixels.size(), reinterpret_cast<jbyte*>(pixels.data()));
        sd_img_gen_params_t request;
        sd_img_gen_params_init(&request);
        request.prompt = prompt_text.c_str();
        request.negative_prompt = "text, letters, watermark, photorealism, gore, duplicated subject, noisy background, scenery";
        request.width = request.height = size;
        request.init_image = {static_cast<uint32_t>(size), static_cast<uint32_t>(size), 3, pixels.data()};
        request.strength = strength;
        request.seed = seed;
        request.batch_count = 1;
        request.sample_params.sample_steps = steps;
        request.sample_params.sample_method = EULER_A_SAMPLE_METHOD;
        request.sample_params.guidance.txt_cfg = 6.f;
        request.vae_tiling_params.enabled = true;
        request.vae_tiling_params.tile_size_w = request.vae_tiling_params.tile_size_h = 256;
        const bool success = generate_image(loaded, &request, &cleanup.result);
        auto* generated=cleanup.result;
        if (success && !job->cancelled && generated && generated->count == 1) {
            auto image = generated->items[0].image;
            if (image.width == size && image.height == size && image.channel == 3 && image.data) {
                output = env->NewByteArray(size*size*3);
                if (output) env->SetByteArrayRegion(output, 0, size*size*3, reinterpret_cast<jbyte*>(image.data));
            }
        }
    }
    job->generate_ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-ready).count();
    rusage usage{}; getrusage(RUSAGE_SELF, &usage); job->peak_rss_kib = usage.ru_maxrss;
    if (!output && !env->ExceptionCheck()) fail(env, job->cancelled ? "Cancelled" : "Local image generation failed");
    return output;
    } catch (const std::exception&) {
        if (!env->ExceptionCheck()) fail(env, "Native runtime could not complete this request");
        return nullptr;
    }
}
