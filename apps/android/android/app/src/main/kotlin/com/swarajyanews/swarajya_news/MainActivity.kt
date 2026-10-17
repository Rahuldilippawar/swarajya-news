package com.swarajyanews.swarajya_news

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The "news" channel that Cloud Functions send to (android.notification.channelId).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel("news", "बातम्या", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Breaking and important news from Swarajya News"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
