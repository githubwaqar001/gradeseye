package pk.edu.hitec.wddregister;

/**
 * Single place to plug this app into the real backend.
 *
 * This project was built without access to the existing GradesEye Google Apps Script
 * project, so the sync/notification layer below talks to a documented, placeholder
 * endpoint and falls back to local demo data when it can't reach it. Point
 * APPS_SCRIPT_WEB_APP_URL at the real deployed Web App URL (Teacher App → Apps Script
 * deployment, section 11 of the prompt) and this becomes live.
 *
 * Expected contract (JSON over HTTPS GET/POST, matching what section 11/17 describes
 * as the existing Drive+Excel workflow):
 *   GET  {BASE_URL}?action=checkUpdates&teacherEmail=...&sinceToken=...
 *        -> { "token": "...", "announcements": [...], "messages": [...], "gradesPublished": [...] }
 *   POST {BASE_URL}  body: { action: "publishAnnouncement", classCode, title, body }
 *   POST {BASE_URL}  body: { action: "registerTeacher", name, designation, institution, email }
 *   POST {BASE_URL}  body: { action: "createClass", semester, section, courseConfig }
 * Swap this for the real contract once the Apps Script source is available.
 */
public final class AppConfig {

    /** Replace with the deployed Google Apps Script Web App URL (section 11). */
    public static final String APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/REPLACE_ME/exec";

    /** Replace with the OAuth 2.0 Web client ID from Google Cloud Console (section 9/11 Gmail sign-in). */
    public static final String GOOGLE_OAUTH_WEB_CLIENT_ID = "REPLACE_ME.apps.googleusercontent.com";

    /** How often background sync checks for new announcements/messages/grades (minutes). Android enforces a 15 min floor. */
    public static final long SYNC_INTERVAL_MINUTES = 20;

    public static final String PREFS_NAME = "gradeseye_secure_prefs";
    public static final String PREF_CACHED_SESSION = "cached_session_json";
    public static final String PREF_SYNC_TOKEN = "last_sync_token";

    private AppConfig() {}
}
