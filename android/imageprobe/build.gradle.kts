plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "io.github.kdkrkwhr.notebuddy.imageprobe"
    compileSdk = 36
    ndkVersion = "30.0.16248370"
    providers.gradleProperty("imageNdkPath").orNull?.let { ndkPath = it }
    defaultConfig {
        applicationId = "io.github.kdkrkwhr.notebuddy.imgqa20261026"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "0.1-probe"
        ndk { abiFilters += "arm64-v8a" }
        externalNativeBuild.cmake {
            arguments += listOf("-DANDROID_STL=c++_static", "-DSD_SOURCE=" + providers.gradleProperty("imageRuntimePath").get())
            providers.gradleProperty("imageRuntimeBuildPath").orNull?.let { arguments += "-DSD_BUILD_PATH=$it" }
            cppFlags += "-std=c++17"
        }
    }
    externalNativeBuild.cmake { path = file("../image-runtime/src/main/cpp/CMakeLists.txt"); version = "3.22.1" }
    sourceSets.getByName("main").java.srcDir("../image-runtime/src/main/kotlin")
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildFeatures { buildConfig = true }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
