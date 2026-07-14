package com.drivinginstructor.callassistant

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat

// שירות שמאזין להתראות מערכת ומזהה שיחות WhatsApp (וגם WhatsApp Business).
// אנדרואיד לא חושף שיחות VoIP ישירות, אבל כן מאפשר לקרוא התראות של
// אפליקציות אחרות - וכך אפשר לזהות שיחת WhatsApp נכנסת/פעילה.
//
// דורש הרשאת "גישה להתראות" (BIND_NOTIFICATION_LISTENER_SERVICE),
// שהמשתמש מאשר ידנית בהגדרות המערכת.
class WhatsAppCallListenerService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val pkg = sbn.packageName
    if (pkg != WHATSAPP_PKG && pkg != WHATSAPP_BUSINESS_PKG) {
      return
    }

    val extras = sbn.notification.extras
    val title = extras.getCharSequence("android.title")?.toString() ?: ""
    val text = extras.getCharSequence("android.text")?.toString() ?: ""
    val category = sbn.notification.category

    // התראת שיחה מזוהה לפי הקטגוריה "call" או לפי טקסט אופייני.
    val isCall =
      category == "call" ||
        CALL_KEYWORDS.any { text.contains(it) || title.contains(it) }

    if (!isCall) {
      return
    }

    // מונעים כפילויות: אותה שיחה מפרסמת התראה מספר פעמים.
    val key = sbn.key
    if (key == lastHandledKey) {
      return
    }
    lastHandledKey = key

    // שם המתקשר בדרך כלל בכותרת ההתראה.
    val contactName = title.ifEmpty { "שיחת WhatsApp" }

    val activeModule = AndroidCallStateModule.activeModule
    if (activeModule != null) {
      // האפליקציה פתוחה - פותחים ישירות את מסך אחרי-שיחה.
      activeModule.emitCallEnded(
        CallEndedEvent(
          phoneNumber = contactName,
          durationSeconds = 0,
          direction = "incoming",
          endedAt = System.currentTimeMillis(),
        )
      )
    } else {
      showWhatsAppNotification(applicationContext, contactName)
    }
  }

  private fun showWhatsAppNotification(context: Context, contactName: String) {
    val manager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "שיחות WhatsApp",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "התראה לתיעוד שיחת WhatsApp"
      }
      manager.createNotificationChannel(channel)
    }

    val deepLink = Uri.parse(
      "mobile-template://after-call" +
        "?contactName=${Uri.encode(contactName)}" +
        "&direction=incoming" +
        "&endedAt=${System.currentTimeMillis()}" +
        "&source=whatsapp"
    )

    val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val pendingIntent = PendingIntent.getActivity(
      context,
      1,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.sym_action_call)
      .setContentTitle("שיחת WhatsApp: $contactName")
      .setContentText("הקש לתיעוד השיחה ב-DriveCall AI")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .build()

    manager.notify(NOTIFICATION_ID, notification)
  }

  companion object {
    private const val WHATSAPP_PKG = "com.whatsapp"
    private const val WHATSAPP_BUSINESS_PKG = "com.whatsapp.w4b"
    private const val CHANNEL_ID = "whatsapp_call"
    private const val NOTIFICATION_ID = 5124
    private var lastHandledKey: String? = null

    // מילות מפתch שמופיעות בהתראת שיחת WhatsApp (עברית ואנגלית).
    private val CALL_KEYWORDS = listOf(
      "שיחה",
      "שיחת וידאו",
      "Calling",
      "Voice call",
      "Video call",
      "Ongoing call",
      "Incoming call",
      "WhatsApp call",
    )
  }
}
