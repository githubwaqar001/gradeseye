package pk.edu.hitec.wddstudent;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Section 7: students get "mobile notification + popup + sound" when their teacher
 * publishes grades, attendance or announcements. Two channels so each can be muted
 * independently.
 */
public final class NotificationHelper {

    public static final String CHANNEL_GRADES = "grades_attendance";
    public static final String CHANNEL_ANNOUNCEMENTS = "announcements";

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

        nm.createNotificationChannel(grades);
        nm.createNotificationChannel(announcements);
    }

    /** Fires a popup + sound + vibration notification on the given channel (section 7). */
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
