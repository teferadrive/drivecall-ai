package com.drivinginstructor.callassistant

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AndroidCallStateModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AndroidCallStateModule"

  @ReactMethod
  fun startListening(promise: Promise) {
    // ה-receiver רשום ב-AndroidManifest ולכן עובד גם כשהאפליקציה סגורה.
    // כאן רק מסמנים שהאפליקציה פעילה, כדי שהשיחה תיפתח ישירות במסך
    // (ולא כהתראה) כשהאפליקציה בפוקוס.
    activeModule = this
    promise.resolve(true)
  }

  @ReactMethod
  fun stopListening(promise: Promise) {
    // מנקים את הסימון כדי שמעכשיו שיחות יוצגו כהתראה (רקע).
    activeModule = null
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by React Native NativeEventEmitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by React Native NativeEventEmitter.
  }

  fun emitCallEnded(event: CallEndedEvent) {
    val payload = Arguments.createMap().apply {
      putString("phoneNumber", event.phoneNumber ?: "")
      putString("contactName", "")
      putInt("durationSeconds", event.durationSeconds)
      putString("direction", event.direction)
      putDouble("endedAt", event.endedAt.toDouble())
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onCallEnded", payload)
  }

  fun emitCallStarted(phoneNumber: String?, direction: String) {
    val payload = Arguments.createMap().apply {
      putString("phoneNumber", phoneNumber ?: "")
      putString("direction", direction)
      putDouble("startedAt", System.currentTimeMillis().toDouble())
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onCallStarted", payload)
  }

  companion object {
    var activeModule: AndroidCallStateModule? = null
      private set
  }
}

data class CallEndedEvent(
  val phoneNumber: String?,
  val durationSeconds: Int,
  val direction: String,
  val endedAt: Long,
)
