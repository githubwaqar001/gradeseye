package pk.edu.hitec.wddregister;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Section 18/19/20: announcements, student messages and grade/attendance publishing all
 * need "mobile notification + popup + sound" per the prompt. Three channels so a teacher
 * can mute one kind without losing the others (Android Settings > App > Notifications).
 */
public final class NotificationHelper {

    public static final String CHANNEL_GRADES = "grades_attendance";
    public static final String CHANNEL_ANNOUNCEMENTS = "announcements";
    public static final String CHANNEL_MESSAGES = "messages";

    private final Context context;
    private int nextId = 1000;

    public NotificationHelper(Context context) {
        this.context = context.getApplicationContext();
        createChannels();
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel grades = new NotificationChannel(
                CHANNEL_GRADES, context.getString(R.string.notif_channel_grades),
                NotificationManager.IMPORTANCE_HIGH);
        grades.setDescription(context.getString(R.string.notif_channel_grades_desc));
        grades.enableVibration(true);

        NotificationChannel announcements = new NotificationChannel(
                CHANNEL_ANNOUNCEMENTS, context.getString(R.string.notif_channel_announcements),
                NotificationManager.IMPORTANCE_HIGH);
        announcements.setDescription(context.getString(R.string.notif_channel_announcements_desc));
        announcements.enableVibration(true);

        NotificationChannel messages = new NotificationChannel(
                CHANNEL_MESSAGES, context.getString(R.string.notif_channel_messages),
                NotificationManager.IMPORTANCE_HIGH);
        messages.setDescription(context.getString(R.string.notif_channel_messages_desc));
        messages.enableVibration(true);

        nm.createNotificationChannel(grades);
        nm.createNotificationChannel(announcements);
        nm.createNotificationChannel(messages);
    }

    /** Fires a popup + sound + vibration notification on the given channel (section 18/19/20). */
    public void show(String channelId, String title, String body) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL);
        NotificationManagerCompat.from(context).notify(nextId++, builder.build());
    }
}
