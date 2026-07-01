# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class io.firebase.** { *; }

# Matter.js (via Hermes)
-keep class com.syntaxandco.waterring.** { *; }

# RevenueCat
-keep class com.revenuecat.purchases.** { *; }

# React Native Sound
-keep class com.zmxv.RNSound.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Native Skia
-keep class com.shopify.reactnative.skia.** { *; }

# MMKV
-keep class com.tencent.mmkv.** { *; }

# Crypto
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
