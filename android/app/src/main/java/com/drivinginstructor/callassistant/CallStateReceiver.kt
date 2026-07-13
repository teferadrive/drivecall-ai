package com.drivinginstructor.callassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

class CallStateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_NEW_OUTGOING_CALL) {
      lastPhoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
      currentDirection = "outgoing"
      return
    }

    if (intent.action != "android.intent.action.PHONE_STATE") {
      return
    }

    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
    val phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

    when (state) {
      TelephonyManager.EXTRA_STATE_RINGING -> {
        lastPhoneNumber = phoneNumber
        currentDirection = "incoming"
        callStartedAt = 0L
        wasInCall = false
        // שיחה נכנסת מתחילה לצלצל - יש להשהות הקלטה מיד.
        AndroidCallStateModule.activeModule?.emitCallStarted(phoneNumber, "incoming")
      }

      TelephonyManager.EXTRA_STATE_OFFHOOK -> {
        if (currentDirection == null) {
          currentDirection = "outgoing"
          // שיחה יוצאת התחילה (לא עברה דרך RINGING) - להשהות הקלטה.
          AndroidCallStateModule.activeModule?.emitCallStarted(phoneNumber, "outgoing")
        }
        if (phoneNumber != null) {
          lastPhoneNumber = phoneNumber
        }
        callStartedAt = System.currentTimeMillis()
        wasInCall = true
      }

      TelephonyManager.EXTRA_STATE_IDLE -> {
        if (wasInCall) {
          val endedAt = System.currentTimeMillis()
          val durationSeconds =
            if (callStartedAt > 0L) ((endedAt - callStartedAt) / 1000L).toInt() else 0

          AndroidCallStateModule.activeModule?.emitCallEnded(
            CallEndedEvent(
              phoneNumber = lastPhoneNumber,
              durationSeconds = durationSeconds,
              direction = currentDirection ?: "incoming",
              endedAt = endedAt,
            )
          )
        }

        lastPhoneNumber = null
        currentDirection = null
        callStartedAt = 0L
        wasInCall = false
      }
    }
  }

  companion object {
    private var lastPhoneNumber: String? = null
    private var currentDirection: String? = null
    private var callStartedAt: Long = 0L
    private var wasInCall: Boolean = false
  }
}
