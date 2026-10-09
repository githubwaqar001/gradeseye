/* GradesEye Teacher app — single-page UI implementing sections 1, 8-23 of the prompt. */
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
  let currentClassId = null;

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

  async function render(route) {
    openDrawer(false);
    const profile = Backend.getProfile();
    if (!profile || !profile.email) { renderRegister(); return; }
    document.querySelectorAll('.navItem').forEach(el => el.classList.toggle('active', el.dataset.screen === route.screen));

    switch (route.screen) {
      case 'classes': return renderClasses();
      case 'createClass': return renderCreateClass();
      case 'classDetail': return renderClassDetail(route.params.classId);
      case 'messages': return renderMessagesHub();
      case 'profile': return renderProfile();
      case 'appsScript': return renderAppsScriptWizard(true);
      default: return renderClasses();
    }
  }

  // ---------------- Registration (section 9) ----------------
  function renderRegister() {
    setTop('GradesEye', 'Teacher registration', false);
    body.innerHTML = `
      <div class="page">
        <div class="card">
          <h3>Set up your teacher account</h3>
          <label>Full Name</label><input id="r_name" type="text" placeholder="Dr. M. Waqar">
          <label>Designation</label><input id="r_desig" type="text" placeholder="Lecturer">
          <label>Institution Name</label><input id="r_inst" type="text" placeholder="HITEC University Taxila">
          <label>Institution Logo</label><input id="r_logo" type="file" accept="image/*">
          <label>Profile Picture</label><input id="r_photo" type="file" accept="image/*">
          <div style="height:14px"></div>
          <button class="btn google" id="r_google">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2 14.1-5.4l-6.5-5.5C29.6 34.7 26.9 35.5 24 35.5c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.3-5.6 6.9l6.5 5.5C39.9 37.4 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z"/></svg>
            Register &amp; continue with Gmail/Google
          </button>
          <p class="muted" style="margin-top:10px;font-size:12px">Your account signs in through Google's own sign-in system — no separate app password to remember. This also connects the Google account you'll use for Drive/Apps Script in the next step.</p>
        </div>
      </div>`;

    let logoData = '', photoData = '';
    const toB64 = (input, cb) => input.addEventListener('change', () => {
      const f = input.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => cb(reader.result);
      reader.readAsDataURL(f);
    });
    toB64(document.getElementById('r_logo'), d => logoData = d);
    toB64(document.getElementById('r_photo'), d => photoData = d);

    document.getElementById('r_google').onclick = () => {
      const name = document.getElementById('r_name').value.trim();
      const desig = document.getElementById('r_desig').value.trim();
      const inst = document.getElementById('r_inst').value.trim();
      if (!name || !inst) { toast('Please fill in your name and institution first'); return; }

      window.onGoogleSignInResult = async (account) => {
        if (!account) { toast('Google sign-in was cancelled or failed'); return; }
        const profile = await Backend.registerTeacher({
          fullName: name, designation: desig, institution: inst,
          institutionLogo: logoData, photo: photoData || account.photoUrl,
          email: account.email, displayName: account.displayName,
        });
        Bridge.cacheSession({ email: profile.email, name: profile.fullName });
        toast('Welcome, ' + profile.fullName + '!');
        renderAppsScriptWizard(false);
      };
      Bridge.signInWithGoogle();
    };
  }

  // ---------------- Apps Script connection wizard (section 11) ----------------
  function renderAppsScriptWizard(fromMenu) {
    setTop('Connect Google Drive', 'Gmail / Apps Script setup', fromMenu);
    const profile = Backend.getProfile() || {};
    body.innerHTML = `
      <div class="page">
        <div class="card">
          <h3>Connect your Google Apps Script</h3>
          <p class="muted">Each teacher connects their own Google account — nothing here is shared with other teachers (section 12).</p>
          <ol style="padding-left:18px;line-height:1.9">
            <li>Open <b>script.google.com</b> and create a new project.</li>
            <li>Paste in the existing GradesEye Apps Script code (ask your admin if you don't have it).</li>
            <li>Deploy it as a <b>Web App</b> (Execute as: Me, Who has access: Anyone with the link).</li>
            <li>Copy the Web App URL it gives you and paste it below.</li>
          </ol>
          <button class="btn outline" id="openScript">Open script.google.com</button>
          <label>Web App URL</label>
          <input id="scriptUrl" type="text" placeholder="https://script.google.com/macros/s/.../exec" value="${profile.appsScriptUrl || ''}">
          <div style="height:12px"></div>
          <button class="btn primary" id="saveScript">Save &amp; continue</button>
          <button class="btn outline" id="skipScript" style="margin-top:8px">Skip for now (use demo data)</button>
        </div>
      </div>`;
    document.getElementById('openScript').onclick = () => window.open('https://script.google.com', '_blank');
    document.getElementById('saveScript').onclick = () => {
      const url = document.getElementById('scriptUrl').value.trim();
      if (url) Backend.saveAppsScriptUrl(url);
      navStack = [{ screen: 'classes' }];
      render({ screen: 'classes' });
    };
    document.getElementById('skipScript').onclick = () => { navStack = [{ screen: 'classes' }]; render({ screen: 'classes' }); };
  }

  // ---------------- Classes list (home) ----------------
  async function renderClasses() {
    setTop('GradesEye', (Backend.getProfile() || {}).institution || '', false);
    body.innerHTML = `<div class="page"><div id="classList"></div></div>
      <button class="fab" id="newClassFab">+</button>`;
    document.getElementById('newClassFab').onclick = () => go('createClass');

    const classes = await Backend.listClasses();
    const list = document.getElementById('classList');
    if (!classes.length) {
      list.innerHTML = `<div class="empty">No classes yet.<br>Tap + to create your first class (semester, section &amp; course setup).</div>`;
      return;
    }
    list.innerHTML = classes.map(c => `
      <div class="card" style="cursor:pointer" data-id="${c.id}">
        <div class="row">
          <div class="grow">
            <div style="font-weight:700">${escapeHtml(c.courseName)}</div>
            <div class="muted" style="font-size:12.5px">${escapeHtml(c.semester)} · Section ${escapeHtml(c.section)}</div>
          </div>
          <span class="chip accent">${(c.registeredStudents || []).length} students</span>
        </div>
      </div>`).join('');
    list.querySelectorAll('.card').forEach(el => el.onclick = () => go('classDetail', { classId: el.dataset.id }));
  }

  // ---------------- Create class (sections 13/14/15) ----------------
  function renderCreateClass() {
    setTop('New Class', 'Semester, section & course setup', true);
    body.innerHTML = `
      <div class="page">
        <div class="card">
          <h3>Semester &amp; section</h3>
          <label>Semester</label><input id="c_sem" type="text" placeholder="Fall 2026">
          <label>Section</label><input id="c_sec" type="text" placeholder="A">
          <label>Course Name</label><input id="c_name" type="text" placeholder="Database Systems (CS-301)">
        </div>
        <div class="card">
          <h3>Lectures &amp; attendance</h3>
          <label>Number of lectures</label><input id="c_lectures" type="number" value="16">
          <label>Attendance sheet structure</label>
          <select id="c_attendance">
            <option>8 lectures</option><option selected>16 lectures</option>
            <option>32 lectures</option><option>48 lectures</option><option>Custom</option>
          </select>
        </div>
        <div class="card">
          <h3>Assignments</h3>
          <div id="assignRows"></div>
          <button class="btn outline sm" id="addAssign">+ Add assignment</button>
        </div>
        <div class="card">
          <h3>Exams</h3>
          <div id="examRows"></div>
          <button class="btn outline sm" id="addExam">+ Add exam</button>
        </div>
        <div class="card">
          <h3>CLOs / PLOs</h3>
          <label>Course Learning Outcomes (one per line)</label>
          <textarea id="c_clos" rows="3" placeholder="CLO1: Explain relational database design&#10;CLO2: Write normalized schemas"></textarea>
          <label>Mapped PLOs (one per line, same order as CLOs)</label>
          <textarea id="c_plos" rows="3" placeholder="PLO1&#10;PLO2"></textarea>
        </div>
        <button class="btn primary" id="createBtn" style="margin-bottom:24px">Create class &amp; generate class code</button>
      </div>`;

    const assignRows = document.getElementById('assignRows');
    const examRows = document.getElementById('examRows');
    const addRow = (container, placeholderName) => {
      const row = document.createElement('div');
      row.className = 'row wrap';
      row.style.marginBottom = '8px';
      row.innerHTML = `<input class="grow name" type="text" placeholder="${placeholderName}">
        <input class="marks" type="number" placeholder="Marks" style="width:84px">
        <input class="weight" type="number" placeholder="%" style="width:64px">`;
      container.appendChild(row);
    };
    document.getElementById('addAssign').onclick = () => addRow(assignRows, 'Assignment name');
    document.getElementById('addExam').onclick = () => addRow(examRows, 'Exam name');
    addRow(assignRows, 'Assignment 1'); addRow(examRows, 'Mid Term'); addRow(examRows, 'Final Term');

    const readRows = (container) => Array.from(container.children).map(r => ({
      name: r.querySelector('.name').value, marks: Number(r.querySelector('.marks').value) || 0,
      weight: Number(r.querySelector('.weight').value) || 0,
    })).filter(r => r.name);

    document.getElementById('createBtn').onclick = async () => {
      const semester = document.getElementById('c_sem').value.trim();
      const section = document.getElementById('c_sec').value.trim();
      const courseName = document.getElementById('c_name').value.trim();
      if (!semester || !section || !courseName) { toast('Semester, section and course name are required'); return; }
      const config = {
        lectures: Number(document.getElementById('c_lectures').value) || 16,
        attendanceStructure: document.getElementById('c_attendance').value,
        assignments: readRows(assignRows),
        exams: readRows(examRows),
        clos: document.getElementById('c_clos').value.split('\n').map(s => s.trim()).filter(Boolean),
        plos: document.getElementById('c_plos').value.split('\n').map(s => s.trim()).filter(Boolean),
      };
      const cls = await Backend.createClass({ semester, section, courseName, config });
      toast('Class created — code ' + cls.code);
      navStack = [{ screen: 'classes' }];
      go('classDetail', { classId: cls.id });
    };
  }

  // ---------------- Class detail (code, announcements, messages, visibility, students, export) ----------------
  async function renderClassDetail(classId) {
    currentClassId = classId;
    const classes = await Backend.listClasses();
    const cls = classes.find(c => c.id === classId);
    if (!cls) { go('classes'); return; }
    setTop(cls.courseName, cls.semester + ' · Section ' + cls.section, true);

    body.innerHTML = `
      <div class="page">
        <div class="card">
          <div class="row">
            <div class="grow">
              <div class="muted" style="font-size:12px">CLASS CODE</div>
              <div style="font-size:20px;font-weight:800;letter-spacing:.5px">${cls.code}</div>
            </div>
            <button class="btn outline sm" id="copyCode">Copy code</button>
          </div>
        </div>
        <div class="tabbar" id="tabbar">
          <button class="active" data-tab="announce">Announce</button>
          <button data-tab="messages">Messages</button>
          <button data-tab="students">Students</button>
          <button data-tab="visibility">Visibility</button>
        </div>
        <div id="tabBody"></div>
      </div>`;

    document.getElementById('copyCode').onclick = async () => {
      try { await navigator.clipboard.writeText(cls.code); toast('Class code copied'); }
      catch (e) { toast(cls.code); }
    };

    const tabs = { announce: renderAnnounceTab, messages: renderMessagesTab, students: renderStudentsTab, visibility: renderVisibilityTab };
    document.querySelectorAll('#tabbar button').forEach(btn => btn.onclick = () => {
      document.querySelectorAll('#tabbar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabs[btn.dataset.tab](cls);
    });
    renderAnnounceTab(cls);
  }

  function renderAnnounceTab(cls) {
    const el = document.getElementById('tabBody');
    el.innerHTML = `
      <div class="card">
        <h3>Publish announcement</h3>
        <label>Title</label><input id="an_title" type="text">
        <label>Message</label><textarea id="an_body" rows="3"></textarea>
        <button class="btn primary" id="an_publish" style="margin-top:10px">Publish &amp; notify students</button>
      </div>
      <div id="an_list"></div>`;
    document.getElementById('an_publish').onclick = async () => {
      const title = document.getElementById('an_title').value.trim();
      const bodyTxt = document.getElementById('an_body').value.trim();
      if (!title) { toast('Title is required'); return; }
      await Backend.publishAnnouncement(cls.id, title, bodyTxt);
      toast('Announcement published');
      renderAnnounceTab(cls);
    };
    (cls.announcements || []).forEach(a => {
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = `<div style="font-weight:700">${escapeHtml(a.title)}</div><div class="muted" style="font-size:12.5px">${escapeHtml(a.body || '')}</div>`;
      document.getElementById('an_list').appendChild(d);
    });
  }

  async function renderMessagesTab(cls) {
    const el = document.getElementById('tabBody');
    const messages = await Backend.getMessages(cls.id);
    el.innerHTML = messages.length
      ? messages.map(m => `<div class="list-row"><div class="avatar">${escapeHtml((m.studentName || '?')[0])}</div>
          <div class="grow"><b>${escapeHtml(m.studentName)}</b><div class="muted" style="font-size:13px">${escapeHtml(m.text)}</div></div></div>`).join('')
      : `<div class="empty">No messages for this class yet.</div>`;
  }

  async function renderStudentsTab(cls) {
    const el = document.getElementById('tabBody');
    const students = await Backend.getRegisteredStudents(cls.id);
    el.innerHTML = `
      <div class="card">
        <div class="row"><h3 class="grow" style="margin:0">Registered students (via class code)</h3>
          <button class="btn outline sm" id="exportBtn">Export Excel</button></div>
        <p class="muted" style="font-size:12.5px">Separate from your own manually-maintained roster (section 16) — nothing here is auto-merged into it.</p>
      </div>`;
    const list = document.createElement('div');
    list.innerHTML = students.length
      ? students.map(s => `<div class="list-row"><div class="avatar">${escapeHtml((s.studentName || '?')[0])}</div>
          <div class="grow">${escapeHtml(s.studentName)}<div class="muted" style="font-size:12px">${escapeHtml(s.regNo || '')}</div></div></div>`).join('')
      : `<div class="empty">No one has joined with this class code yet.</div>`;
    el.appendChild(list);
    document.getElementById('exportBtn').onclick = () => exportClassExcel(cls, students);
  }

  function renderVisibilityTab(cls) {
    const el = document.getElementById('tabBody');
    const items = [
      ['grades', 'Grades'], ['attendance', 'Attendance'], ['assignments', 'Assignments'],
      ['exams', 'Exams'], ['announcements', 'Announcements'],
    ];
    el.innerHTML = `<div class="card"><h3>What students can see</h3>${items.map(([key, label]) => `
      <div class="row" style="justify-content:space-between;padding:8px 0">
        <span>${label}</span>
        <label class="switch"><input type="checkbox" data-key="${key}" ${cls.visibility[key] ? 'checked' : ''}><span class="track"></span></label>
      </div>`).join('')}</div>`;
    el.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = async () => {
      cls.visibility[cb.dataset.key] = cb.checked;
      await Backend.updateVisibility(cls.id, cls.visibility);
      toast('Updated');
    });
  }

  function exportClassExcel(cls, students) {
    if (typeof XLSX === 'undefined') { toast('Excel library not loaded — check your connection'); return; }
    const profile = Backend.getProfile() || {};
    const rows = [[profile.institution || ''], [cls.courseName + ' — ' + cls.semester + ' Section ' + cls.section], [],
      ['Reg No', 'Student Name', ...(cls.config && cls.config.assignments || []).map(a => a.name), ...(cls.config && cls.config.exams || []).map(e => e.name)]];
    (students.length ? students : [{ regNo: '—', studentName: 'No students yet' }]).forEach(s => rows.push([s.regNo || '', s.studentName || '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class Data');
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    Bridge.shareFile(b64, cls.courseName.replace(/[^a-z0-9]+/gi, '_') + '.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  // ---------------- Messages hub (section 19) ----------------
  async function renderMessagesHub() {
    setTop('Messages', 'All classes', true);
    const grouped = await Backend.getAllMessagesGroupedByClass();
    body.innerHTML = `<div class="page">${grouped.map(g => `
      <div class="card">
        <h3>${escapeHtml(g.cls.courseName)}</h3>
        ${g.messages.length ? g.messages.map(m => `<div class="list-row"><div class="avatar">${escapeHtml((m.studentName || '?')[0])}</div>
            <div class="grow"><b>${escapeHtml(m.studentName)}</b><div class="muted" style="font-size:13px">${escapeHtml(m.text)}</div></div></div>`).join('')
          : '<div class="muted" style="font-size:13px">No messages</div>'}
      </div>`).join('') || '<div class="empty">No classes yet</div>'}</div>`;
  }

  // ---------------- Profile (section 21) ----------------
  function renderProfile() {
    setTop('Profile', '', true);
    const p = Backend.getProfile() || {};
    body.innerHTML = `
      <div class="page">
        <div class="card" style="text-align:center">
          <div class="avatar" style="width:72px;height:72px;margin:0 auto 10px;font-size:26px">
            ${p.photo ? `<img src="${p.photo}">` : escapeHtml((p.fullName || '?')[0])}
          </div>
          <div style="font-weight:700;font-size:16px">${escapeHtml(p.fullName || '')}</div>
          <div class="muted">${escapeHtml(p.designation || '')} · ${escapeHtml(p.institution || '')}</div>
          <div class="chip accent" style="margin-top:8px">${escapeHtml(p.email || '')}</div>
        </div>
        <div class="card">
          <button class="btn outline" id="goScript">Gmail / Apps Script connection</button>
        </div>
        <div class="card">
          <button class="btn danger block" id="signOut">Sign out</button>
        </div>
      </div>`;
    document.getElementById('goScript').onclick = () => go('appsScript');
    document.getElementById('signOut').onclick = () => {
      Bridge.clearSession(); Bridge.signOutGoogle();
      navStack = []; render({ screen: 'register' });
      location.reload();
    };
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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

  render({ screen: 'classes' });
})();
