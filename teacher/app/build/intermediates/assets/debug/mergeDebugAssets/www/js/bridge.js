/**
 * Wraps the native `window.Native` JavascriptInterface (see JsBridge.java) so the rest of
 * the app can call Bridge.* without caring whether it's running inside the real Android
 * WebView or being previewed in a desktop browser during development (where window.Native
 * doesn't exist — falls back to localStorage + navigator.onLine so the UI stays usable).
 */
const Bridge = (() => {
  const native = typeof window.Native !== 'undefined' ? window.Native : null;

  return {
    isNative: !!native,

    cacheSession(sessionObj) {
      const json = JSON.stringify(sessionObj);
      if (native) native.cacheSession(json);
      else localStorage.setItem('gradeseye_cached_session', json);
    },

    getCachedSession() {
      const raw = native ? native.getCachedSession() : (localStorage.getItem('gradeseye_cached_session') || '');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    clearSession() {
      if (native) native.clearSession();
      else localStorage.removeItem('gradeseye_cached_session');
    },

    isOnline() {
      return native ? native.isOnline() : navigator.onLine;
    },

    notify(channel, title, body) {
      if (native) { native.notify(channel, title, body); return; }
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    },

    requestNotificationPermission() {
      if (native) native.requestNotificationPermission();
      else if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
    },

    shareFile(base64Data, filename, mime) {
      if (native) { native.shareFile(base64Data, filename, mime); return; }
      // Browser fallback: trigger a normal download.
      const link = document.createElement('a');
      link.href = 'data:' + mime + ';base64,' + base64Data;
      link.download = filename;
      link.click();
    },

    // Teacher app only; undefined (no-op) in the student bridge usage.
    signInWithGoogle() {
      if (native && native.signInWithGoogle) native.signInWithGoogle();
      else if (window.onGoogleSignInResult) {
        // Desktop preview stub so the registration flow is still clickable during design review.
        window.onGoogleSignInResult({ email: 'demo.teacher@gmail.com', displayName: 'Demo Teacher', idToken: 'demo', photoUrl: '' });
      }
    },

    signOutGoogle() {
      if (native && native.signOutGoogle) native.signOutGoogle();
    },

    onConnectivityChange(cb) {
      window.onConnectivityChange = cb;
      window.addEventListener('online', () => cb(true));
      window.addEventListener('offline', () => cb(false));
    }
  };
})();
