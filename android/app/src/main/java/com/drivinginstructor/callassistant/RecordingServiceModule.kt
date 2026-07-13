package com.drivinginstructor.callassistant

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// גשר JS -> שירות ההקלטה הקדמי.
// מאפשר להתחיל/לעצור את ה-foreground service מתוך React Native.
class RecordingServiceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "RecordingServiceModule"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      val intent = Intent(reactContext, RecordingService::class.java).apply {
        action = RecordingService.ACTION_START
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val intent = Intent(reactContext, RecordingService::class.java).apply {
        action = RecordingService.ACTION_STOP
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_FAILED", e.message, e)
    }
  }
}
