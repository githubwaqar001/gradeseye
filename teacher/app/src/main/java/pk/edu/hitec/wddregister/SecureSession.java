package pk.edu.hitec.wddregister;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.io.IOException;
import java.security.GeneralSecurityException;

/**
 * Section 9/10: "the teacher can log in to the app offline using a securely cached
 * Google Sign-In session" and section 2: the same offline capability for students.
 * Backed by Jetpack Security's EncryptedSharedPreferences (AES-256), not plain prefs,
 * so the cached session/credentials are not readable if the device storage is pulled.
 */
public final class SecureSession {

    private static final String TAG = "SecureSession";
    private final SharedPreferences prefs;

    public SecureSession(Context context) {
        SharedPreferences p;
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            p = EncryptedSharedPreferences.create(
                    context,
                    AppConfig.PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (GeneralSecurityException | IOException e) {
            // Falls back to a regular (unencrypted) prefs file only if the keystore is
            // unavailable on this device; logged loudly so it's never silently insecure.
            Log.e(TAG, "EncryptedSharedPreferences unavailable, falling back to plain prefs", e);
            p = context.getSharedPreferences(AppConfig.PREFS_NAME + "_fallback", Context.MODE_PRIVATE);
        }
        this.prefs = p;
    }

    public void saveSession(String sessionJson) {
        prefs.edit().putString(AppConfig.PREF_CACHED_SESSION, sessionJson).apply();
    }

    public String getSession() {
        return prefs.getString(AppConfig.PREF_CACHED_SESSION, null);
    }

    public void clearSession() {
        prefs.edit().remove(AppConfig.PREF_CACHED_SESSION).apply();
    }

    public void saveSyncToken(String token) {
        prefs.edit().putString(AppConfig.PREF_SYNC_TOKEN, token).apply();
    }

    public String getSyncToken() {
        return prefs.getString(AppConfig.PREF_SYNC_TOKEN, null);
    }
}
