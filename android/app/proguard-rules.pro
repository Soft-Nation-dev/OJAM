# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Keep the application and activity classes from being stripped
-keep class com.softnation.ojam.MainApplication { *; }
-keep class com.softnation.ojam.MainActivity { *; }

# Keep React Native and New Architecture internal glue code
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Essential for react-native-track-player
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keep class androidx.media3.** { *; }
