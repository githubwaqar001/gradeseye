/**
 * Backend contract for the Teacher app, matching AppConfig.java's doc-comment:
 *   GET  {BASE_URL}?action=checkUpdates&teacherEmail=...&sinceToken=...
 *   POST {BASE_URL}  { action, ...payload }
 *
 * IMPORTANT — read this before wiring the real backend:
 * This project was built without the existing GradesEye Google Apps Script source, so
 * every method below tries a real fetch() first (once a Web App URL is connected via the
 * Settings > Gmail/Apps Script screen, section 11) and falls back to a local, fully
 * working demo simulation (localStorage) when there's no backend configured or the call
 * fails. That means the whole app is usable and demoable right now, AND the moment the
 * real Apps Script endpoints exist, flipping them on is just a matter of matching this
 * contract server-side (or adjusting the fetch calls below to match the real one).
 *
 * CLASS CODE FORMAT (an assumption, flagged for confirmation): because section 12 requires
 * every teacher's class/Drive/Apps Script to be fully independent, with no shared external
 * directory service allowed, a class code here is `<deploymentId>.<classId>` — the
 * deployment ID *is* the teacher's own Apps Script Web App deployment ID, so any device
 * can reconstruct `https://script.google.com/macros/s/<deploymentId>/exec` straight from
 * the code the student types in, with nothing else to look up. Confirm this matches (or
 * adjust it to match) however class codes are actually minted in the real system.
 */
const Backend = (() => {
  const LS = {
    profile: 'ge_profile',
    classes: 'ge_classes',
    messages: 'ge_messages',
  };

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
  function shortDeploymentId() {
    // Stands in for a real Apps Script deployment ID until section 11's wizard captures the real one.
    return 'AKfycb' + Math.random().toString(36).slice(2, 10);
  }

  function backendUrl() {
    const p = load(LS.profile, null);
    return p && p.appsScriptUrl ? p.appsScriptUrl : null;
  }

  async function tryFetch(action, { method = 'GET', body = null, query = {} } = {}) {
    const base = backendUrl();
    if (!base || !Bridge.isOnline()) return null;
    try {
      let url = base;
      if (method === 'GET') {
        const qs = new URLSearchParams({ action, ...query }).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ action, ...body }) : undefined,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null; // backend not reachable / not wired up yet — caller falls back to demo data
    }
  }

  return {
    // ---- Section 9/11: registration + Gmail/Apps Script connection ----
    async registerTeacher(profileFields) {
      const existing = load(LS.profile, {});
      const profile = {
        ...existing,
        ...profileFields,
        deploymentId: existing.deploymentId || shortDeploymentId(),
        registeredAt: existing.registeredAt || new Date().toISOString(),
      };
      save(LS.profile, profile);
      return profile;
    },

    getProfile() { return load(LS.profile, null); },

    saveAppsScriptUrl(url) {
      const profile = load(LS.profile, {});
      profile.appsScriptUrl = url;
      save(LS.profile, profile);
      return profile;
    },

    // ---- Section 13/14: semester/section/class setup with flexible config ----
    async listClasses() {
      const remote = await tryFetch('listClasses');
      if (remote) return remote.classes;
      return load(LS.classes, []);
    },

    async createClass({ semester, section, courseName, config }) {
      const profile = load(LS.profile, {});
      const classId = uid('cls');
      const code = (profile.deploymentId || shortDeploymentId()) + '.' + classId.slice(4);
      const cls = {
        id: classId, semester, section, courseName, config, code,
        createdAt: new Date().toISOString(),
        visibility: { grades: true, attendance: true, assignments: true, exams: true, announcements: true },
        registeredStudents: [], announcements: [], gradesPublished: false,
      };
      const remote = await tryFetch('createClass', { method: 'POST', body: { semester, section, courseName, config } });
      const list = load(LS.classes, []);
      list.push(remote && remote.class ? remote.class : cls);
      save(LS.classes, list);
      return cls;
    },

    async updateVisibility(classId, visibility) {
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      if (cls) { cls.visibility = visibility; save(LS.classes, list); }
      await tryFetch('updateVisibility', { method: 'POST', body: { classId, visibility } });
      return cls;
    },

    // ---- Section 18: announcements ----
    async publishAnnouncement(classId, title, body) {
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      if (cls) {
        cls.announcements = cls.announcements || [];
        cls.announcements.unshift({ id: uid('an'), title, body, at: new Date().toISOString() });
        save(LS.classes, list);
      }
      await tryFetch('publishAnnouncement', { method: 'POST', body: { classId, title, body } });
      Bridge.notify('announcements', 'Announcement published', title);
      return cls;
    },

    // ---- Section 19: messages from students, grouped by class ----
    async getMessages(classId) {
      const remote = await tryFetch('getMessages', { query: { classId } });
      if (remote) return remote.messages;
      const all = load(LS.messages, demoMessages());
      return all.filter(m => m.classId === classId);
    },

    async getAllMessagesGroupedByClass() {
      const classes = await this.listClasses();
      const out = [];
      for (const c of classes) out.push({ cls: c, messages: await this.getMessages(c.id) });
      return out;
    },

    // ---- Section 20: grade/attendance publishing (demo) ----
    async publishGrades(classId, summary) {
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      if (cls) { cls.gradesPublished = true; save(LS.classes, list); }
      await tryFetch('publishGrades', { method: 'POST', body: { classId, summary } });
      Bridge.notify('grades_attendance', 'Grades published', summary || 'New grades are available');
      return cls;
    },

    // ---- Section 16: registered students (separate from the teacher's own manual roster) ----
    async getRegisteredStudents(classId) {
      const remote = await tryFetch('getRegisteredStudents', { query: { classId } });
      if (remote) return remote.students;
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      return (cls && cls.registeredStudents) || [];
    },
  };

  function demoMessages() {
    return [
      { id: 'm1', classId: null, studentName: 'Ayesha Khan', text: 'Sir, when will the Assignment 2 marks be uploaded?', at: new Date(Date.now() - 36e5).toISOString() },
      { id: 'm2', classId: null, studentName: 'Bilal Ahmed', text: 'I was absent on medical leave, can I get my attendance corrected?', at: new Date(Date.now() - 9e6).toISOString() },
    ];
  }
})();
