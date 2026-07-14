package com.drivinginstructor.callassistant

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat

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
          val number = lastPhoneNumber ?: ""
          val direction = currentDirection ?: "incoming"

          val activeModule = AndroidCallStateModule.activeModule
          if (activeModule != null) {
            // האפליקציה פתוחה - פותחים ישירות את מסך אחרי-שיחה.
            activeModule.emitCallEnded(
              CallEndedEvent(
                phoneNumber = number,
                durationSeconds = durationSeconds,
                direction = direction,
                endedAt = endedAt,
              )
            )
          } else {
            // האפליקציה ברקע/סגורה - מציגים התראה שפותחת את המסך בהקשה.
            showAfterCallNotification(
              context,
              number,
              durationSeconds,
              direction,
              endedAt
            )
          }
        }

        lastPhoneNumber = null
        currentDirection = null
        callStartedAt = 0L
        wasInCall = false
      }
    }
  }

  // מציג התראה בסיום שיחה (כשהאפליקציה ברקע). הקשה פותחת את מסך אחרי-שיחה
  // דרך deep link, כי אנדרואיד חוסם פתיחת מסך אוטומטית מהרקע.
  private fun showAfterCallNotification(
    context: Context,
    phoneNumber: String,
    durationSeconds: Int,
    direction: String,
    endedAt: Long
  ) {
    val manager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "אחרי שיחה",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "התראה לתיעוד שיחה שהסתיימה"
      }
      manager.createNotificationChannel(channel)
    }

    val deepLink = Uri.parse(
      "mobile-template://after-call" +
        "?phoneNumber=${Uri.encode(phoneNumber)}" +
        "&durationSeconds=$durationSeconds" +
        "&direction=$direction" +
        "&endedAt=$endedAt" +
        "&source=regular"
    )

    val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val pendingIntent = PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val title = if (phoneNumber.isNotEmpty()) phoneNumber else "שיחה הסתיימה"
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.sym_action_call)
      .setContentTitle(title)
      .setContentText("הקש לתיעוד השיחה ב-DriveCall AI")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .build()

    manager.notify(NOTIFICATION_ID, notification)
  }

  companion object {
    private const val CHANNEL_ID = "after_call"
    private const val NOTIFICATION_ID = 5123
    private var lastPhoneNumber: String? = null
    private var currentDirection: String? = null
    private var callStartedAt: Long = 0L
    private var wasInCall: Boolean = false
  }
}
