package com.drivinginstructor.callassistant

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// גשר JS לניהול הרשאת "גישה להתראות" (לזיהוי שיחות WhatsApp).
class NotificationAccessModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "NotificationAccessModule"

  // בודק אם המשתמש כבר אישר לאפליקציה גישה להתראות.
  @ReactMethod
  fun isEnabled(promise: Promise) {
    try {
      val enabledListeners = Settings.Secure.getString(
        reactContext.contentResolver,
        "enabled_notification_listeners"
      ) ?: ""
      val hasAccess = enabledListeners.contains(reactContext.packageName)
      promise.resolve(hasAccess)
    } catch (e: Exception) {
      promise.reject("CHECK_FAILED", e.message, e)
    }
  }

  // פותח את מסך הגדרות "גישה להתראות" כדי שהמשתמש יאשר.
  @ReactMethod
  fun openSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("OPEN_FAILED", e.message, e)
    }
  }
}
