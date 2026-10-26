plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
val imageBackend = providers.gradleProperty("imageBackend").orElse("cpu").get()
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
        buildConfigField("String", "IMAGE_BACKEND", "\"$imageBackend\"")
        if (imageBackend != "cpu") applicationIdSuffix = ".$imageBackend"
        ndk { abiFilters += "arm64-v8a" }
        externalNativeBuild.cmake {
            arguments += listOf("-DANDROID_STL=c++_static", "-DSD_SOURCE=" + providers.gradleProperty("imageRuntimePath").get())
            providers.gradleProperty("imageRuntimeBuildPath").orNull?.let { arguments += "-DSD_BUILD_PATH=$it" }
            arguments += "-DNB_IMAGE_BACKEND=$imageBackend"
            providers.gradleProperty("imageOpenClLinkLibrary").orNull?.let { arguments += "-DOPENCL_LINK_LIBRARY=$it" }
            providers.gradleProperty("imageOpenClHeaders").orNull?.let { arguments += "-DOPENCL_INCLUDE_DIR=$it" }
            cppFlags += "-std=c++17"
        }
    }
    externalNativeBuild.cmake { path = file("../image-runtime/src/main/cpp/CMakeLists.txt"); version = "3.22.1" }
    sourceSets.getByName("main").java.srcDir("../image-runtime/src/main/kotlin")
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildFeatures { buildConfig = true }
    if (imageBackend == "opencl") packaging.jniLibs.excludes += "**/libOpenCL.so"
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
