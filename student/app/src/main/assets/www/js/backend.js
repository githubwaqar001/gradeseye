/**
 * Backend contract for the Student app.
 *
 * IMPORTANT — read this before wiring the real backend (same situation as the Teacher
 * app's backend.js): built without the existing Apps Script source, so every call below
 * tries a real fetch() first and falls back to a local working demo simulation
 * (localStorage) when there's nothing to reach yet.
 *
 * Unlike the Teacher app, a student's classes can belong to DIFFERENT teachers, each with
 * their OWN independent Apps Script deployment (section 12). So there is no single
 * backendUrl() here — each joined class remembers its own backend URL, decoded from the
 * class code the student typed in (see decodeClassCode below; same assumption flagged in
 * the Teacher app's backend.js — confirm/adjust once the real class-code scheme is known).
 */
const Backend = (() => {
  const LS = { session: 'ge_session', classes: 'ge_joined_classes' };

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }

  function decodeClassCode(code) {
    const parts = String(code || '').trim().split('.');
    if (parts.length !== 2) return null;
    const [deploymentId, classId] = parts;
    return { deploymentId, classId, url: 'https://script.google.com/macros/s/' + deploymentId + '/exec' };
  }

  async function tryFetch(url, action, { method = 'GET', body = null, query = {} } = {}) {
    if (!url || !Bridge.isOnline()) return null;
    try {
      let finalUrl = url;
      if (method === 'GET') {
        const qs = new URLSearchParams({ action, ...query }).toString();
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
      const res = await fetch(finalUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ action, ...body }) : undefined,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  return {
    decodeClassCode,

    // ---- Section 2: independent login with Registration Number + Key ----
    async login(regNo, key) {
      if (!regNo || !key) throw new Error('Registration number and key are required');
      const session = {
        token: uid('tok'), regNo, studentName: load(LS.session, {}).studentName || regNo,
        loginAt: new Date().toISOString(),
      };
      save(LS.session, session);
      return session;
    },

    getSession() { return load(LS.session, null); },
    setStudentName(name) {
      const s = load(LS.session, {});
      s.studentName = name;
      save(LS.session, s);
    },
    logout() { localStorage.removeItem(LS.session); },

    // ---- Section 3: Join Class (validated against THAT class's own teacher backend) ----
    async joinClass(classCode) {
      const decoded = decodeClassCode(classCode);
      if (!decoded) throw new Error('That class code doesn\'t look right — double check it with your teacher.');
      const session = load(LS.session, {});

      const remote = await tryFetch(decoded.url, 'joinClass', {
        method: 'POST',
        body: { classCode, regNo: session.regNo, studentName: session.studentName },
      });

      const list = load(LS.classes, []);
      if (list.some(c => c.code === classCode)) throw new Error('You\'re already enrolled in this class.');
      const cls = remote && remote.class ? remote.class : demoClassFor(classCode, decoded);
      cls.backendUrl = decoded.url;
      list.push(cls);
      save(LS.classes, list);
      return cls;
    },

    async listJoinedClasses() { return load(LS.classes, []); },

    async getClassDashboard(classId) {
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      if (!cls) return null;
      const remote = await tryFetch(cls.backendUrl, 'getDashboard', { query: { classId } });
      return remote && remote.dashboard ? remote.dashboard : demoDashboardFor(cls);
    },

    // ---- Section 4: Message Teacher, per class ----
    async messageTeacher(classId, text) {
      const list = load(LS.classes, []);
      const cls = list.find(c => c.id === classId);
      if (!cls) throw new Error('Class not found');
      await tryFetch(cls.backendUrl, 'messageTeacher', {
        method: 'POST',
        body: { classId, regNo: load(LS.session, {}).regNo, text },
      });
      return true;
    },

    // ---- Section 7: pull updates across every joined class (also called by native SyncWorker's contract) ----
    async checkAllUpdates() {
      const list = load(LS.classes, []);
      const out = [];
      for (const cls of list) {
        const remote = await tryFetch(cls.backendUrl, 'checkUpdates', { query: { classId: cls.id } });
        if (remote) out.push({ classId: cls.id, ...remote });
      }
      return out;
    },
  };

  function demoClassFor(code, decoded) {
    const names = ['Database Systems (CS-301)', 'Web Design & Development (CS-309)', 'Artificial Intelligence (CS-412)'];
    return {
      id: 'cls_' + decoded.classId,
      code,
      courseName: names[Math.floor(Math.random() * names.length)],
      teacherName: 'Dr. M. Waqar',
      semester: 'Fall 2026', section: 'A',
      visibility: { grades: true, attendance: true, assignments: true, exams: true, announcements: true },
    };
  }

  function demoDashboardFor(cls) {
    return {
      announcements: [
        { id: 'a1', title: 'Assignment 2 deadline extended to Friday', at: new Date(Date.now() - 5e6).toISOString() },
      ],
      attendance: { present: 27, total: 32 },
      grades: [
        { item: 'Assignment 1', marks: 18, total: 20 },
        { item: 'Quiz 1', marks: 8, total: 10 },
        { item: 'Mid Term', marks: 34, total: 40 },
      ],
      assignments: [{ name: 'Assignment 2', due: '2026-10-17', status: 'Submitted' }],
      exams: [{ name: 'Final Term', date: '2026-12-15' }],
      courseInfo: { creditHours: 3, instructor: cls.teacherName || 'TBD' },
    };
  }
})();
