package pk.edu.hitec.wddregister;

import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Thin client for the Apps Script Web App backend described in AppConfig. Every call
 * degrades to null/false on failure rather than throwing, because AppConfig.APPS_SCRIPT_WEB_APP_URL
 * is a placeholder until the real deployment URL is filled in (section 11) — a dev build must
 * run cleanly even before that's wired up.
 */
public final class NetworkClient {

    private static final String TAG = "NetworkClient";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build();

    /** GET {BASE_URL}?action=checkUpdates&role=teacher&teacherEmail=...&sinceToken=... */
    public JSONObject checkUpdates(String teacherEmail, String sinceToken) {
        try {
            String url = AppConfig.APPS_SCRIPT_WEB_APP_URL
                    + "?action=checkUpdates&role=teacher"
                    + "&teacherEmail=" + teacherEmail
                    + "&sinceToken=" + (sinceToken == null ? "" : sinceToken);
            Request request = new Request.Builder().url(url).get().build();
            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONObject(response.body().string());
            }
        } catch (IOException | JSONException e) {
            Log.w(TAG, "checkUpdates failed (backend not wired up yet?): " + e.getMessage());
            return null;
        }
    }

    /** POST {BASE_URL} body: {"action": action, ...payload}. Returns the parsed response, or null on failure. */
    public JSONObject post(String action, JSONObject payload) {
        try {
            payload.put("action", action);
            RequestBody body = RequestBody.create(payload.toString(), JSON);
            Request request = new Request.Builder().url(AppConfig.APPS_SCRIPT_WEB_APP_URL).post(body).build();
            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONObject(response.body().string());
            }
        } catch (IOException | JSONException e) {
            Log.w(TAG, "post(" + action + ") failed: " + e.getMessage());
            return null;
        }
    }
}
