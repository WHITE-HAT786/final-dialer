package expo.modules.pjsip

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder

/**
 * Keeps SIP registration + an active call alive when the app is backgrounded.
 * Started while registered / in-call, stopped on unregister/hangup.
 * foregroundServiceType=microphone (declared in the manifest via the plugin).
 */
class SipForegroundService : Service() {
  companion object {
    private const val CHANNEL = "sip_call"
    private const val NOTIF_ID = 4201
    fun start(ctx: Context) { ctx.startService(Intent(ctx, SipForegroundService::class.java)) }
    fun stop(ctx: Context) { ctx.stopService(Intent(ctx, SipForegroundService::class.java)) }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL, "SIP calls", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val n: Notification = Notification.Builder(this, CHANNEL)
      .setContentTitle("Depth Route")
      .setContentText("SIP registered")
      .setSmallIcon(android.R.drawable.stat_sys_phone_call)
      .build()
    startForeground(NOTIF_ID, n)
    return START_STICKY
  }
}
