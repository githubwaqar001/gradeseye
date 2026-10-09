package pk.edu.hitec.wddstudent;

/**
 * Single place to plug this app into the real backend.
 *
 * This project was built without access to the existing GradesEye Google Apps Script
 * project, so the sync/notification layer below talks to a documented, placeholder
 * endpoint and falls back to local demo data when it can't reach it. Point
 * APPS_SCRIPT_WEB_APP_URL at the real deployed Web App URL and this becomes live.
 *
 * Expected contract (JSON over HTTPS GET/POST):
 *   POST {BASE_URL} body: { action: "login", regNo, key }
 *        -> { "token": "...", "studentName": "...", "classes": [...] }
 *   POST {BASE_URL} body: { action: "joinClass", token, classCode }
 *   GET  {BASE_URL}?action=checkUpdates&token=...&sinceToken=...
 *        -> { "token": "...", "announcements": [...], "gradesPublished": [...], "attendance": [...] }
 *   POST {BASE_URL} body: { action: "messageTeacher", token, classCode, message }
 * Swap this for the real contract once the Apps Script source is available.
 */
public final class AppConfig {

    /** Replace with the deployed Google Apps Script Web App URL. */
    public static final String APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/REPLACE_ME/exec";

    /** How often background sync checks for new announcements/grades/attendance (minutes). Android enforces a 15 min floor. */
    public static final long SYNC_INTERVAL_MINUTES = 20;

    public static final String PREFS_NAME = "gradeseye_secure_prefs";
    public static final String PREF_CACHED_SESSION = "cached_session_json";
    public static final String PREF_SYNC_TOKEN = "last_sync_token";

    private AppConfig() {}
}
