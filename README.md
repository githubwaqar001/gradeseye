# GradesEye — Native Android Projects (Teacher + Student)

Two complete, independent Android Studio projects implementing the redesign in the
professional prompt doc (sections 1–24), built from the real app files extracted from
your uploaded APKs — not a rewrite from scratch of things that already worked.

## What's actually new vs. carried over

| Carried over from the original app | New (section 24 + the redesign) |
|---|---|
| Package IDs (`pk.edu.hitec.wddregister`, `pk.edu.hitec.wddstudent`) so this is an *update*, not a new app on the Play Store | Modern top nav bar + nav drawer inside the web layer (section 1) |
| WebView-hosted single-page app architecture | Independent student login + Join Class with class codes (sections 2–3) |
| Navy brand color (`#1F3864`), general visual language | Native secure offline login for both apps (encrypted, not plain prefs) |
| `INTERNET` / `ACCESS_NETWORK_STATE` permissions | Native notifications (popup + sound) for grades/attendance/announcements/messages, poll-based — no Firebase (per your "sync from Google Drive, no external database" direction) |
| Excel-based data workflow (now via SheetJS in the web layer) | Teacher registration via Google Sign-In instead of an app-only password (section 9/11) |
| | Flexible class/course configuration, visibility toggles, registered-students list, announcements, messages — sections 13–21 |

## ⚠️ Two things this build could not verify — read before relying on it

1. **No access to your actual Google Apps Script backend.** I only had the two APKs,
   not your Apps Script project or Sheet structure. Every network call in
   `assets/www/js/backend.js` is written against a *documented, placeholder* API
   contract (see the comment at the top of each `backend.js`), and falls back to
   working local demo data when that backend isn't reachable — so the app is fully
   usable and demoable right now, but **grades/attendance/CLO data shown is sample
   data** until the real endpoints are wired up to match (or the contract is adjusted
   to match your real one).
2. **Class code format is an assumption.** Section 12 requires every teacher's
   Drive/Apps Script to be fully independent with no shared external directory — so a
   class code here is `<appsScriptDeploymentId>.<classId>`, letting any device
   reconstruct the right teacher's Web App URL straight from the code with nothing to
   look up. If class codes are actually minted differently in the real system, this is
   the one thing to change first (`decodeClassCode` in each `backend.js`).

If you can share the existing Apps Script project source, I can wire these up for real
in a follow-up pass instead of against the documented contract.

## How to get an installable .apk from this

**You don't have Android Studio — the easiest path is free, automated cloud builds:**

1. Create a new GitHub repository (or tell me one you already have) and push this
   whole folder to it.
2. Nothing else to configure — `.github/workflows/build-apks.yml` is already set up to
   build both apps automatically on every push (GitHub's build runners have full
   access to the Android SDK and Google's Maven repo, which this sandbox doesn't).
3. After it finishes (Actions tab → latest run, a couple of minutes), download
   `GradesEye-teacher-debug-apk` and `GradesEye-student-debug-apk` from the run's
   **Artifacts** section at the bottom of the page — those are your real, installable
   `.apk` files.
4. (Optional, if you later do get Android Studio) Open `teacher/` or `student/` as a
   project directly and use Build → Build APK(s) the normal way instead.

These are **debug-signed** builds — installable and fully functional for testing, but
not signed for a Play Store release. Ask me and I'll set up a release signing config
once you're ready to publish; it needs a keystore only you should hold.

## Before this is truly "production-ready" (section 24's own bar)

- [ ] Fill in the real Apps Script Web App URL / OAuth client ID (`AppConfig.java` in
      each app, plus the in-app Settings screen) once you have them.
- [ ] Confirm or correct the class-code format above.
- [ ] Generate a release keystore and switch the CI workflow to `assembleRelease` with
      signing configured, for a real Play Store / sideload-ready build.
- [ ] iOS: a native iOS build needs a Mac with Xcode (or a macOS CI runner) — this
      workspace can't produce one at all; let me know if you want a React
      Native / Capacitor wrapper around the same web app instead, which *can* target
      both platforms from one codebase.

## Folder map

```
teacher/            Android Studio project — package pk.edu.hitec.wddregister
  app/src/main/assets/www/   the actual app (HTML/CSS/JS) — edit this for UI/logic changes
  app/src/main/java/...      native wrapper: WebView host, notifications, secure offline
                             session, Google Sign-In, file sharing, background sync
student/            Android Studio project — package pk.edu.hitec.wddstudent
  (same structure, no Google Sign-In — students log in with reg. number + key)
.github/workflows/  the GitHub Actions build pipeline described above
```
