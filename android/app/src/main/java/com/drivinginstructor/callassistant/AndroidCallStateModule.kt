package com.drivinginstructor.callassistant

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AndroidCallStateModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var receiver: CallStateReceiver? = null

  override fun getName(): String = "AndroidCallStateModule"

  @ReactMethod
  fun startListening(promise: Promise) {
    if (receiver == null) {
      receiver = CallStateReceiver()
      val filter = IntentFilter().apply {
        addAction("android.intent.action.PHONE_STATE")
        addAction(Intent.ACTION_NEW_OUTGOING_CALL)
      }
      reactContext.registerReceiver(receiver, filter)
    }

    activeModule = this
    promise.resolve(true)
  }

  @ReactMethod
  fun stopListening(promise: Promise) {
    receiver?.let {
      reactContext.unregisterReceiver(it)
    }
    receiver = null
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
