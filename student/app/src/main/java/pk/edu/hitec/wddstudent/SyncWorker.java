package pk.edu.hitec.wddstudent;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.ExistingPeriodicWorkPolicy;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

/**
 * Background half of section 7 (grades, attendance, announcements): polls the backend
 * every AppConfig.SYNC_INTERVAL_MINUTES, even while the app is backgrounded, and fires a
 * native notification for anything new, for each class the student is enrolled in.
 * Poll-based — no Firebase/FCM — per the "sync from Google Drive, no external database" direction.
 */
public class SyncWorker extends Worker {

    private static final String UNIQUE_NAME = "gradeseye_student_sync";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    public static void schedulePeriodic(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                SyncWorker.class, AppConfig.SYNC_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build();
        WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SecureSession session = new SecureSession(context);
        String sessionJson = session.getSession();
        if (sessionJson == null) {
            return Result.success();
        }

        String token;
        try {
            token = new JSONObject(sessionJson).optString("token", "");
        } catch (Exception e) {
            return Result.success();
        }
        if (token.isEmpty()) return Result.success();

        NetworkClient net = new NetworkClient();
        JSONObject update = net.checkUpdates(token, session.getSyncToken());
        if (update == null) {
            return Result.success();
        }

        NotificationHelper notifications = new NotificationHelper(context);
        try {
            JSONArray announcements = update.optJSONArray("announcements");
            if (announcements != null) {
                for (int i = 0; i < announcements.length(); i++) {
                    JSONObject a = announcements.getJSONObject(i);
                    notifications.show(NotificationHelper.CHANNEL_ANNOUNCEMENTS,
                            "Announcement — " + a.optString("className", "Class"),
                            a.optString("title", ""));
                }
            }
            JSONArray grades = update.optJSONArray("gradesPublished");
            if (grades != null) {
                for (int i = 0; i < grades.length(); i++) {
                    JSONObject g = grades.getJSONObject(i);
                    notifications.show(NotificationHelper.CHANNEL_GRADES,
                            "Grades updated — " + g.optString("className", "Class"),
                            g.optString("summary", "New grades are available"));
                }
            }
            JSONArray attendance = update.optJSONArray("attendance");
            if (attendance != null) {
                for (int i = 0; i < attendance.length(); i++) {
                    JSONObject a = attendance.getJSONObject(i);
                    notifications.show(NotificationHelper.CHANNEL_GRADES,
                            "Attendance updated — " + a.optString("className", "Class"),
                            a.optString("summary", "New attendance is available"));
                }
            }
            String newToken = update.optString("token", null);
            if (newToken != null) session.saveSyncToken(newToken);
        } catch (Exception ignored) {
        }

        return Result.success();
    }
}
