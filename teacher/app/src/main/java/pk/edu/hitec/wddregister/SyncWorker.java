package pk.edu.hitec.wddregister;

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
 * Background half of section 18/19/20 (announcements, messages, published grades):
 * polls the backend every AppConfig.SYNC_INTERVAL_MINUTES, even while the app is
 * backgrounded, and fires a native notification for anything new. Poll-based by design,
 * per the "messages/notifications sync from Google Drive like grades and attendance —
 * no external database or push service" direction — no Firebase/FCM dependency.
 */
public class SyncWorker extends Worker {

    private static final String UNIQUE_NAME = "gradeseye_teacher_sync";

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
            // Not registered/logged in yet — nothing to sync.
            return Result.success();
        }

        String teacherEmail;
        try {
            teacherEmail = new JSONObject(sessionJson).optString("email", "");
        } catch (Exception e) {
            return Result.success();
        }
        if (teacherEmail.isEmpty()) return Result.success();

        NetworkClient net = new NetworkClient();
        JSONObject update = net.checkUpdates(teacherEmail, session.getSyncToken());
        if (update == null) {
            // Backend unreachable or not wired up yet (AppConfig placeholder URL) — quietly retry next cycle.
            return Result.success();
        }

        NotificationHelper notifications = new NotificationHelper(context);
        try {
            JSONArray messages = update.optJSONArray("messages");
            if (messages != null) {
                for (int i = 0; i < messages.length(); i++) {
                    JSONObject m = messages.getJSONObject(i);
                    notifications.show(NotificationHelper.CHANNEL_MESSAGES,
                            "Message — " + m.optString("className", "Class"),
                            m.optString("studentName", "A student") + ": " + m.optString("text", ""));
                }
            }
            JSONArray grades = update.optJSONArray("gradesPublished");
            if (grades != null) {
                for (int i = 0; i < grades.length(); i++) {
                    JSONObject g = grades.getJSONObject(i);
                    notifications.show(NotificationHelper.CHANNEL_GRADES,
                            "Grades published — " + g.optString("className", "Class"),
                            g.optString("summary", "New grades are available"));
                }
            }
            String newToken = update.optString("token", null);
            if (newToken != null) session.saveSyncToken(newToken);
        } catch (Exception ignored) {
            // malformed payload from a not-yet-real backend; don't crash the periodic worker
        }

        return Result.success();
    }
}
