package pk.edu.hitec.wddstudent;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.webkit.JavascriptInterface;

/**
 * Exposed to the web app (assets/www) as `window.Native`. The web app carries the
 * section 1-7 student UI/business logic; this bridge adds the native-only pieces: secure
 * offline session storage, real device connectivity, native notifications/permissions,
 * and file sharing.
 */
public class JsBridge {

    private final MainActivity activity;
    private final SecureSession session;
    private final NotificationHelper notifications;

    public JsBridge(MainActivity activity) {
        this.activity = activity;
        this.session = new SecureSession(activity);
        this.notifications = new NotificationHelper(activity);
    }

    /** Section 2: cache the logged-in session so the student can log in offline next time. */
    @JavascriptInterface
    public void cacheSession(String sessionJson) {
        session.saveSession(sessionJson);
    }

    @JavascriptInterface
    public String getCachedSession() {
        String s = session.getSession();
        return s == null ? "" : s;
    }

    @JavascriptInterface
    public void clearSession() {
        session.clearSession();
        activity.runOnUiThread(() -> android.webkit.CookieManager.getInstance().removeAllCookies(null));
    }

    @JavascriptInterface
    public boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    /** Section 7: lets the web app trigger an immediate local notification. */
    @JavascriptInterface
    public void notify(String channel, String title, String body) {
        String ch = NotificationHelper.CHANNEL_ANNOUNCEMENTS;
        if (NotificationHelper.CHANNEL_GRADES.equals(channel)) ch = NotificationHelper.CHANNEL_GRADES;
        notifications.show(ch, title, body);
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        activity.runOnUiThread(activity::requestNotificationPermissionIfNeeded);
    }

    @JavascriptInterface
    public void shareFile(String base64Data, String filename, String mime) {
        activity.runOnUiThread(() -> activity.shareFile(base64Data, filename, mime));
    }

    @JavascriptInterface
    public String getAppVersion() {
        return BuildConfig.VERSION_NAME;
    }
}
