package com.educatok.islahmedia;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

// Service natif Android pour afficher les appels entrants prives en plein ecran.
// Role: reactiver l'ecran verrouille et ouvrir REZO sur la conversation cible.
public class IncomingCallFirebaseService extends FirebaseMessagingService {
    private static final String CALL_CHANNEL_ID = "incoming_calls";
    private static final int WAKE_DURATION_MS = 10_000;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) {
            return;
        }

        boolean isIncomingCall = "incoming_call".equals(data.get("type"))
                || "true".equalsIgnoreCase(data.get("isPrivateCall"));

        if (!isIncomingCall) {
            return;
        }

        createNotificationChannel();
        showIncomingCallNotification(remoteMessage, data);

        if (!isAppInForeground()) {
            launchIncomingCallScreen(data);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel callChannel = new NotificationChannel(
                CALL_CHANNEL_ID,
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
    }

    private void showIncomingCallNotification(RemoteMessage remoteMessage, Map<String, String> data) {
        Intent launchIntent = buildLaunchIntent(data);
        String normalizedPath = launchIntent.getData() != null && launchIntent.getData().getPath() != null
                ? launchIntent.getData().getPath()
                : "/messages";

        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent fullScreenIntent = PendingIntent.getActivity(
                this,
                normalizedPath.hashCode(),
                launchIntent,
                pendingIntentFlags);

        String title = data.get("title");
        if (title == null || title.isBlank()) {
            title = remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : "Appel entrant";
        }

        String message = data.get("message");
        if (message == null || message.isBlank()) {
            message = remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : "Vous avez un appel entrant";
        }

        Notification notification = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(message)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone_call"))
                .setVibrate(new long[] { 0, 500, 200, 500 })
                .setAutoCancel(true)
                .setOngoing(true)
                .setFullScreenIntent(fullScreenIntent, true)
                .setContentIntent(fullScreenIntent)
                .build();

        NotificationManagerCompat.from(this).notify(normalizedPath.hashCode(), notification);
    }

    private Intent buildLaunchIntent(Map<String, String> data) {
        String clickAction = data.get("click_action");
        if (clickAction == null || clickAction.isBlank()) {
            String senderId = data.get("senderId");
            clickAction = senderId != null && !senderId.isBlank() ? "/conversations/" + senderId : "/messages";
        }

        String normalizedPath = clickAction.startsWith("/") ? clickAction : "/" + clickAction;
        String separator = normalizedPath.contains("?") ? "&" : "?";
        normalizedPath = normalizedPath + separator + "incomingCall=1";
        Uri deepLinkUri = Uri.parse("educatok://open" + normalizedPath);

        Intent launchIntent = new Intent(Intent.ACTION_VIEW, deepLinkUri, this, MainActivity.class);
        launchIntent.putExtra("showIncomingCall", true);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return launchIntent;
    }

    private void launchIncomingCallScreen(Map<String, String> data) {
        try {
            wakeScreen();
            startActivity(buildLaunchIntent(data));
        } catch (Exception exception) {
            android.util.Log.w("IncomingCallService", "Unable to launch incoming call screen", exception);
        }
    }

    private void wakeScreen() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) {
            return;
        }

        @SuppressWarnings("deprecation")
        PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                        | PowerManager.ACQUIRE_CAUSES_WAKEUP
                        | PowerManager.ON_AFTER_RELEASE,
                getPackageName() + ":incoming_call");

        wakeLock.acquire(WAKE_DURATION_MS);
        wakeLock.release();
    }

    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) {
            return false;
        }

        String packageName = getPackageName();
        for (ActivityManager.RunningAppProcessInfo processInfo : activityManager.getRunningAppProcesses()) {
            if (processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                    && packageName.equals(processInfo.processName)) {
                return true;
            }
        }

        return false;
    }
}