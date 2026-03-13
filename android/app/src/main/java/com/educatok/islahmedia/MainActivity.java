package com.educatok.islahmedia;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FirebaseApp.initializeApp(this);
        createNotificationChannels();
    }

    /**
     * Crée les canaux de notification pour Android O+ (API 26+)
     * - incoming_calls : haute priorité avec son personnalisé pour les appels
     * entrants
     * - default : canal par défaut pour les notifications classiques
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null)
                return;

            // Canal pour les appels entrants — haute priorité
            NotificationChannel callChannel = new NotificationChannel(
                    "incoming_calls",
                    "Appels entrants",
                    NotificationManager.IMPORTANCE_HIGH);
            callChannel.setDescription("Notifications pour les appels audio/vidéo entrants");
            callChannel.setSound(
                    Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone_call"),
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[] { 0, 500, 200, 500 });
            callChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            callChannel.setBypassDnd(true);
            manager.createNotificationChannel(callChannel);

            // Canal par défaut pour les messages, etc.
            NotificationChannel defaultChannel = new NotificationChannel(
                    "default",
                    "Notifications",
                    NotificationManager.IMPORTANCE_DEFAULT);
            defaultChannel.setDescription("Notifications générales de l'application");
            manager.createNotificationChannel(defaultChannel);
        }
    }
}
