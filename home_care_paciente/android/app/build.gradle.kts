plugins {
    id("com.android.application")
    id("kotlin-android")
    // O plugin do Flutter deve ficar por último
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.home_care_paciente"
    compileSdk = flutter.compileSdkVersion

    defaultConfig {
        applicationId = "com.example.home_care_paciente" // mantém este ID
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        multiDexEnabled = true
    }

    // Mantém o NDK que seus plugins pediram
    ndkVersion = "27.0.12077973"

    // >>> MUDE para Java 17 <<<
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions { jvmTarget = "17" }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}

flutter {
    source = "../.."
}
