package com.drivinginstructor.callassistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

// שירות קדמי (Foreground Service) שמחזיק את תהליך האפליקציה חי
// בזמן הקלטת שיעור, כדי שאנדרואיד לא יעצור את ההקלטה כשהאפליקציה ברקע.
// ההקלטה עצמה מבוצעת ב-JS (expo-audio); השירות רק מונע השבתה.
class RecordingService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopForegroundCompat()
        stopSelf()
        return START_NOT_STICKY
      }
      else -> startAsForeground()
    }
    // START_STICKY: אם המערכת עוצרת את השירות, ננסה להפעילו מחדש.
    return START_STICKY
  }

  private fun startAsForeground() {
    createChannel()

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val notification: Notification = Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("DriveCall AI")
      .setContentText("מקליט שיעור...")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setContentIntent(contentIntent)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        "הקלטת שיעור",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "מציג התראה בזמן הקלטת שיעור פעילה"
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }
  }

  @Suppress("DEPRECATION")
  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      stopForeground(true)
    }
  }

  companion object {
    private const val CHANNEL_ID = "lesson_recording"
    private const val NOTIFICATION_ID = 4711
    const val ACTION_START = "com.drivinginstructor.callassistant.START_RECORDING"
    const val ACTION_STOP = "com.drivinginstructor.callassistant.STOP_RECORDING"
  }
}
