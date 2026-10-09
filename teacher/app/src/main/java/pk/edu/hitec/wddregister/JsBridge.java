package pk.edu.hitec.wddregister;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.webkit.JavascriptInterface;

/**
 * Exposed to the web app (assets/www) as `window.Native`. The web app carries ALL the
 * section 1-23 UI/business logic (same architecture as the original app); this bridge
 * only adds the native-only capabilities section 24 asks for: secure offline session
 * storage, real device connectivity, native notifications/permissions, Google Sign-In,
 * and file sharing — things a WebView page cannot do for itself.
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

    /** Section 9/10: cache the signed-in session so the teacher can log in offline next time. */
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

    /** Section 11: starts native Google Sign-In; result comes back via window.onGoogleSignInResult(json) in the page. */
    @JavascriptInterface
    public void signInWithGoogle() {
        activity.runOnUiThread(activity::startGoogleSignIn);
    }

    @JavascriptInterface
    public void signOutGoogle() {
        activity.runOnUiThread(activity::signOutGoogle);
    }

    /** Section 18/19/20: lets the web app trigger an immediate local notification (e.g. right after publishing). */
    @JavascriptInterface
    public void notify(String channel, String title, String body) {
        String ch = NotificationHelper.CHANNEL_ANNOUNCEMENTS;
        if (NotificationHelper.CHANNEL_GRADES.equals(channel)) ch = NotificationHelper.CHANNEL_GRADES;
        else if (NotificationHelper.CHANNEL_MESSAGES.equals(channel)) ch = NotificationHelper.CHANNEL_MESSAGES;
        notifications.show(ch, title, body);
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        activity.runOnUiThread(activity::requestNotificationPermissionIfNeeded);
    }

    /** Section 17: exports/shares an Excel file the web app produced (base64 .xlsx) via the system share sheet. */
    @JavascriptInterface
    public void shareFile(String base64Data, String filename, String mime) {
        activity.runOnUiThread(() -> activity.shareFile(base64Data, filename, mime));
    }

    @JavascriptInterface
    public String getAppVersion() {
        return BuildConfig.VERSION_NAME;
    }
}
