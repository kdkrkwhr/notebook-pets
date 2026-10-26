plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
val localImageEnabled = providers.gradleProperty("imageRuntimePath").isPresent
android {
    namespace = "io.github.kdkrkwhr.notebuddy.lab"
    compileSdk = 36
    defaultConfig {
        applicationId = "io.github.kdkrkwhr.notebuddy.lab"
        minSdk = 31
        targetSdk = 36
        versionCode = 5
        versionName = "0.2.3-alpha"
        providers.gradleProperty("imageTestSuffix").orNull?.let { applicationIdSuffix = it }
        manifestPlaceholders["appLabel"] = if (providers.gradleProperty("imageTestSuffix").isPresent) "Notebuddy · 기기생성" else "@string/app_name"
        buildConfigField("boolean", "LOCAL_IMAGE_ENABLED", localImageEnabled.toString())
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk { abiFilters += if (localImageEnabled) listOf("arm64-v8a") else listOf("arm64-v8a", "x86_64") }
        if (localImageEnabled) externalNativeBuild.cmake {
            arguments += listOf("-DANDROID_STL=c++_static", "-DSD_SOURCE=" + providers.gradleProperty("imageRuntimePath").get())
            providers.gradleProperty("imageRuntimeBuildPath").orNull?.let { arguments += "-DSD_BUILD_PATH=$it" }
            cppFlags += "-std=c++17"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isReturnDefaultValues = true }
    buildFeatures { buildConfig = true }
    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/gameAssets"))
    sourceSets.getByName("main").java.srcDir("../image-runtime/src/main/kotlin")
    if (localImageEnabled) {
        ndkVersion = "30.0.16248370"
        providers.gradleProperty("imageNdkPath").orNull?.let { ndkPath = it }
        externalNativeBuild.cmake { path = file("../image-runtime/src/main/cpp/CMakeLists.txt"); version = "3.22.1" }
        sourceSets.getByName("main").assets.srcDir("../imageprobe/src/main/assets")
    }
    buildTypes { release { isMinifyEnabled = false } }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("com.google.ai.edge.litertlm:litertlm-android:0.18.1")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.9.4")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.9.4")
    implementation("com.google.code.gson:gson:2.14.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
val bundleGame by tasks.registering(Exec::class) {
    workingDir(rootProject.projectDir.parentFile)
    commandLine(providers.gradleProperty("bundlePython").orElse("python").get(), "android/build_bundle.py")
}
tasks.named("preBuild") { dependsOn(bundleGame) }
