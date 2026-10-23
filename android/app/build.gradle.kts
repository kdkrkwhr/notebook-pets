plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "io.github.kdkrkwhr.notebuddy.lab"
    compileSdk = 36
    defaultConfig {
        applicationId = "io.github.kdkrkwhr.notebuddy.lab"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-lab"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isReturnDefaultValues = true }
    buildTypes { release { isMinifyEnabled = false } }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
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
