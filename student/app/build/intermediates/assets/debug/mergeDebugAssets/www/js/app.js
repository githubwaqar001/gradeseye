/* GradesEye Student app — single-page UI implementing sections 1-7 of the prompt. */
(() => {
  const body = document.getElementById('appBody');
  const topTitle = document.getElementById('topTitleMain');
  const topSub = document.getElementById('topTitleSub');
  const syncChip = document.getElementById('syncChip');
  const backBtn = document.getElementById('backBtn');
  const menuBtn = document.getElementById('menuBtn');
  const navDrawer = document.getElementById('navDrawer');
  const navScrim = document.getElementById('navScrim');

  let navStack = [];

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function setTop(title, sub, showBack) {
    topTitle.textContent = title;
    topSub.textContent = sub || '';
    backBtn.classList.toggle('hidden', !showBack);
    menuBtn.classList.toggle('hidden', !!showBack);
  }

  function openDrawer(open) {
    navDrawer.classList.toggle('open', open);
    navScrim.classList.toggle('open', open);
  }
  menuBtn.onclick = () => openDrawer(true);
  navScrim.onclick = () => openDrawer(false);
  backBtn.onclick = () => { navStack.pop(); render(navStack.pop() || { screen: 'classes' }); };

  function go(screen, params) {
    navStack.push({ screen, params });
    render({ screen, params });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function render(route) {
    openDrawer(false);
    const session = Backend.getSession();
    if (!session) { renderLogin(); return; }
    document.querySelectorAll('.navItem').forEach(el => el.classList.toggle('active', el.dataset.screen === route.screen));
    switch (route.screen) {
      case 'classes': return renderClasses();
      case 'classDashboard': return renderClassDashboard(route.params.classId);
      case 'profile': return renderProfile();
      default: return renderClasses();
    }
  }

  // ---------------- Section 2: independent login (+ offline cached login) ----------------
  function renderLogin() {
    setTop('GradesEye Student', '', false);
    body.innerHTML = `
      <div class="page">
        <div class="card">
          <h3>Log in</h3>
          <label>Registration Number</label>
          <input id="l_reg" type="text" placeholder="21-CS-045">
          <label>Key / Password</label>
          <input id="l_key" type="password" placeholder="Your student key">
          <button class="btn primary" id="l_submit" style="margin-top:14px">Log in</button>
          <p class="muted" style="font-size:12px;margin-top:10px">You don't need to receive this app from a teacher — install it from anywhere and log in with your own registration number and key.</p>
        </div>
      </div>`;
    document.getElementById('l_submit').onclick = async () => {
      const reg = document.getElementById('l_reg').value.trim();
      const key = document.getElementById('l_key').value.trim();
      try {
        const session = await Backend.login(reg, key);
        Bridge.cacheSession(session);
        navStack = []; go('classes');
      } catch (e) { toast(e.message); }
    };
  }

  // ---------------- Classes list + Join Class (section 3) ----------------
  async function renderClasses() {
    const session = Backend.getSession();
    setTop('GradesEye Student', session.studentName || session.regNo, false);
    body.innerHTML = `
      <div class="page">
        <button class="btn primary" id="joinBtn" style="margin-bottom:14px">+ Join Class</button>
        <div id="classList"></div>
      </div>`;
    document.getElementById('joinBtn').onclick = openJoinClassModal;

    const classes = await Backend.listJoinedClasses();
    const list = document.getElementById('classList');
    list.innerHTML = classes.length ? classes.map(c => `
      <div class="card" style="cursor:pointer" data-id="${c.id}">
        <div style="font-weight:700">${escapeHtml(c.courseName)}</div>
        <div class="muted" style="font-size:12.5px">${escapeHtml(c.teacherName || '')} · ${escapeHtml(c.semester)} Section ${escapeHtml(c.section)}</div>
      </div>`).join('') : `<div class="empty">You haven't joined any classes yet.<br>Tap "Join Class" and enter the code your teacher shared.</div>`;
    list.querySelectorAll('.card').forEach(el => el.onclick = () => go('classDashboard', { classId: el.dataset.id }));
  }

  function openJoinClassModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#0007;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div class="card" style="width:100%;max-width:360px;margin:0">
        <h3>Join a class</h3>
        <label>Class Code</label>
        <input id="jc_code" type="text" placeholder="AKfycbXXXXXXXX.ab12cd3">
        <div class="row" style="margin-top:14px;gap:10px">
          <button class="btn outline grow" id="jc_cancel">Cancel</button>
          <button class="btn primary grow" id="jc_join">Join</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#jc_cancel').onclick = () => overlay.remove();
    overlay.querySelector('#jc_join').onclick = async () => {
      const code = overlay.querySelector('#jc_code').value.trim();
      if (!code) return;
      try {
        const cls = await Backend.joinClass(code);
        toast('Joined ' + cls.courseName);
        overlay.remove();
        renderClasses();
      } catch (e) { toast(e.message); }
    };
  }

  // ---------------- Class dashboard (sections 5/6/7) + Message Teacher (section 4) ----------------
  async function renderClassDashboard(classId) {
    const classes = await Backend.listJoinedClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) { go('classes'); return; }
    setTop(cls.courseName, cls.teacherName || '', true);

    body.innerHTML = `<div class="page"><div id="dash" class="empty">Loading…</div></div>`;
    const dash = await Backend.getClassDashboard(classId);
    const v = cls.visibility || {};
    const el = document.getElementById('dash');
    el.className = '';
    el.innerHTML = `
      <div class="card">
        <div class="row">
          <div class="avatar">${escapeHtml((cls.teacherName || '?')[0])}</div>
          <div class="grow">
            <div style="font-weight:700">${escapeHtml(cls.teacherName || 'Teacher')}</div>
            <div class="muted" style="font-size:12.5px">${escapeHtml((dash.courseInfo && dash.courseInfo.creditHours) ? dash.courseInfo.creditHours + ' credit hours' : '')}</div>
          </div>
          <button class="btn outline sm" id="msgBtn">Message</button>
        </div>
      </div>

      ${v.announcements !== false ? section('Announcements', (dash.announcements || []).map(a =>
        `<div class="list-row"><div class="grow"><b>${escapeHtml(a.title)}</b></div></div>`).join('') || empty()) : ''}

      ${v.attendance !== false ? section('Attendance', dash.attendance
        ? `<div class="row"><span class="chip ok">${dash.attendance.present}/${dash.attendance.total} lectures attended</span></div>` : empty()) : ''}

      ${v.grades !== false ? section('Grades', (dash.grades || []).length ? gradeTable(dash.grades) : empty()) : ''}

      ${v.assignments !== false ? section('Assignments', (dash.assignments || []).map(a =>
        `<div class="list-row"><div class="grow">${escapeHtml(a.name)}<div class="muted" style="font-size:12px">Due ${escapeHtml(a.due)}</div></div><span class="chip ${a.status === 'Submitted' ? 'ok' : 'warn'}">${escapeHtml(a.status)}</span></div>`).join('') || empty()) : ''}

      ${v.exams !== false ? section('Exams', (dash.exams || []).map(e =>
        `<div class="list-row"><div class="grow">${escapeHtml(e.name)}</div><span class="chip">${escapeHtml(e.date)}</span></div>`).join('') || empty()) : ''}
    `;

    function section(title, inner) { return `<div class="card"><h3>${title}</h3>${inner}</div>`; }
    function empty() { return `<div class="muted" style="font-size:13px">Nothing here yet</div>`; }
    function gradeTable(grades) {
      return `<table class="grid"><tr><th>Item</th><th>Marks</th></tr>${grades.map(g =>
        `<tr><td>${escapeHtml(g.item)}</td><td>${g.marks}/${g.total}</td></tr>`).join('')}</table>`;
    }

    document.getElementById('msgBtn').onclick = () => openMessageModal(cls);
  }

  function openMessageModal(cls) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:#0007;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div class="card" style="width:100%;max-width:360px;margin:0">
        <h3>Message ${escapeHtml(cls.teacherName || 'teacher')}</h3>
        <textarea id="mt_text" rows="4" placeholder="Type your message…"></textarea>
        <div class="row" style="margin-top:14px;gap:10px">
          <button class="btn outline grow" id="mt_cancel">Cancel</button>
          <button class="btn primary grow" id="mt_send">Send</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#mt_cancel').onclick = () => overlay.remove();
    overlay.querySelector('#mt_send').onclick = async () => {
      const text = overlay.querySelector('#mt_text').value.trim();
      if (!text) return;
      await Backend.messageTeacher(cls.id, text);
      toast('Message sent');
      overlay.remove();
    };
  }

  // ---------------- Profile / sign out ----------------
  function renderProfile() {
    const session = Backend.getSession() || {};
    setTop('Profile', '', true);
    body.innerHTML = `
      <div class="page">
        <div class="card" style="text-align:center">
          <div class="avatar" style="width:72px;height:72px;margin:0 auto 10px;font-size:26px">${escapeHtml((session.studentName || '?')[0])}</div>
          <div style="font-weight:700;font-size:16px">${escapeHtml(session.studentName || session.regNo)}</div>
          <div class="muted">${escapeHtml(session.regNo || '')}</div>
        </div>
        <div class="card"><button class="btn danger block" id="signOut">Sign out</button></div>
      </div>`;
    document.getElementById('signOut').onclick = () => { Backend.logout(); Bridge.clearSession(); navStack = []; render({ screen: 'login' }); };
  }

  // ---------------- Boot ----------------
  Bridge.onConnectivityChange(online => {
    syncChip.textContent = online ? 'Synced' : 'Offline';
    syncChip.style.background = online ? '#ffffff22' : '#9a5b0066';
  });
  syncChip.textContent = Bridge.isOnline() ? 'Synced' : 'Offline';

  document.querySelectorAll('.navItem[data-screen]').forEach(el => el.onclick = () => {
    navStack = [{ screen: el.dataset.screen }];
    render({ screen: el.dataset.screen });
  });

  // Section 2 offline login: a cached session logs the student straight back in.
  const cached = Bridge.getCachedSession();
  if (cached && cached.token) {
    localStorage.setItem('ge_session', JSON.stringify(cached));
  }
  render({ screen: 'classes' });
})();
