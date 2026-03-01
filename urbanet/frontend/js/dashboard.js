// js/dashboard.js — Dashboard rendering and actions

function showGeoModal(fromDash = false) {
  document.getElementById('geoModal').classList.add('on');
  setTimeout(() => renderGeoModal(fromDash), 200);
}

function closeGeoModal() {
  document.getElementById('geoModal').classList.remove('on');
}

function renderGeoModal(fromDash) {
  renderSVGMap('geoMap', currentRole, true, activeZones);
  const role = ROLE_CONFIG[currentRole];
  const statusEl = document.getElementById('geoStatus');
  const actionEl = document.getElementById('geoActionBtn');
  statusEl.className = 'geo-status ok';
  statusEl.innerHTML = `<span class="geo-status-icon">OK</span><div><strong style="color:#00ff88">Geo-fence check passed.</strong> Location authorized for role <strong>${role.title}</strong>. ${role.assignedZone ? `Zone ${role.assignedZone} confirmed.` : 'Full city access.'}</div>`;
  actionEl.innerHTML = fromDash
    ? `<button class="geo-continue-btn" onclick="closeGeoModal()">CLOSE MAP</button>`
    : `<button class="geo-continue-btn" onclick="proceedAfterGeo()">PROCEED TO DASHBOARD</button>`;
}

function proceedAfterGeo() {
  closeGeoModal();
  buildDashboard();
}

// ─── Build Dashboard ─────────────────────────────────────────────────────
function buildDashboard() {
  const role = ROLE_CONFIG[currentRole];
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('dashView').classList.add('active');

  // Sidebar user info
  const av = document.getElementById('sbAvatar');
  av.style.background = role.avatarBg;
  av.style.border = `1px solid ${role.color}40`;
  av.style.color = role.color;
  av.textContent = role.name.split(' ').map(n => n[0]).join('');
  document.getElementById('sbName').textContent = role.name;
  document.getElementById('sbRole').textContent = role.title;
  document.getElementById('sbRole').style.color = role.color;
  const badge = document.getElementById('sbBadge');
  badge.textContent = role.clearance;
  badge.style.background = role.badgeBg;
  badge.style.color = role.badgeColor;
  badge.style.border = `1px solid ${role.color}25`;

  // JWT token preview
  const token = (typeof authToken !== 'undefined' && authToken) || 'DEMO.MODE.TOKEN';
  document.getElementById('jwtPreview').textContent = token.substr(0, 65) + '...';

  // Nav — admin sees everything (locked = grayed out), other roles only see their own items
  const navItemsToRender = currentRole === 'admin'
    ? role.navItems
    : role.navItems.filter(item => !item.locked);

  document.getElementById('sbNav').innerHTML = navItemsToRender.map(item => `
    <div class="sb-nav-item ${item.locked ? 'locked' : ''}" onclick="${item.locked ? `toast('Access restricted — Admin only','warn')` : `addLog('Accessed: ${item.label}','ok')`}">
      <span>${item.icon}</span>${item.label}${item.locked ? ' 🔒' : ''}
    </div>`).join('');

  document.getElementById('dashFirstName').textContent = role.name.split(' ')[0].toUpperCase();

  // Stats
  document.getElementById('statsRow').innerHTML = role.stats.map(s => `
    <div class="stat-card">
      <div class="sc-icon">${s.icon}</div>
      <div class="sc-val">${s.val}</div>
      <div class="sc-label">${s.label}</div>
      <div class="sc-change ${s.up ? 'up' : 'dn'}">${s.change}</div>
    </div>`).join('');

  // API Demo Panel
  buildAPIDemoGrid();

  // Modules — admin sees all (locked shown as grayed), other roles only see unlocked modules
  const modulesToRender = currentRole === 'admin'
    ? role.modules
    : role.modules.filter(m => !m.locked);

  document.getElementById('modulesGrid').innerHTML = modulesToRender.map(m => `
    <div class="mod-card ${m.locked ? 'locked' : ''}" onclick="${m.locked ? `toast('Module restricted — contact Admin','warn')` : `addLog('Accessed: ${m.name}','ok')`}">
      ${m.locked ? '<div class="mod-lock">🔒 RESTRICTED</div>' : ''}
      <div class="mod-icon">${m.icon}</div>
      <div class="mod-name">${m.name}</div>
      <div class="mod-desc">${m.desc}</div>
      <div class="mod-status">
        <div class="d" style="background:${m.status==='LOCKED'?'#3a5570':m.status==='ELEVATED'?'#ff7730':m.status==='ACTIVE'?'#ff2255':'#00ff88'}"></div>
        <span style="color:${m.status==='LOCKED'?'#3a5570':m.status==='ELEVATED'?'#ff7730':m.status==='ACTIVE'?'#ff2255':'#00ff88'};font-family:JetBrains Mono,monospace;font-size:9px;">${m.status}</span>
      </div>
    </div>`).join('');

  // Permissions — show granted perms and denied perms from role config
  const denyAll = role.denyPerms && role.denyPerms.length > 0
    ? role.denyPerms
    : ['DELETE:LOGS','MANAGE:USERS','EMERGENCY:DECLARE','WRITE:ANY','SYSTEM:CONFIG'].filter(p => !role.perms.includes(p));
  document.getElementById('permTags').innerHTML =
    role.perms.map(p => `<span class="ptag allow">${p}</span>`).join('') +
    denyAll.map(p => `<span class="ptag deny">${p}</span>`).join('');

  // Emergency controls
  const ep = document.getElementById('emergPanel');
  ep.style.display = role.canEmergency ? 'block' : 'none';

  // Init audit log
  document.getElementById('auditList').innerHTML = '';
  addLog(`Authenticated — ${role.badge} — Role: ${currentRole}`, 'ok');
  addLog(`JWT issued — 4h session — JTI: ${sessionJTI || 'DEMO'}`, 'ok');
  addLog(`Geo-fence verified — Zone: ${role.assignedZone || 'ALL'}`, 'ok');
  addLog(`Risk score computed — Level: LOW`, 'ok');

  // Geo map
  setTimeout(() => renderSVGMap('dashGeoMap', currentRole, false, activeZones), 300);

  // Session timer
  sessionSeconds = 14400;
  clearInterval(sessionInterval);
  sessionInterval = setInterval(tickSession, 1000);

  // WebSocket
  initSocket();

  toast(`Welcome, ${role.name.split(' ')[0]}! Session active.`, 'success');
}

// ─── API Demo Grid ──────────────────────────────────────────────────────
function buildAPIDemoGrid() {
  const role = ROLE_CONFIG[currentRole];
  const demos = role.apiDemos || [];
  document.getElementById('apiDemoGrid').innerHTML = demos.map((d, i) => `
    <div class="api-card" id="apicard-${i}" onclick="callAPIDemo(${i})">
      <span class="api-method ${d.method.toLowerCase()}">${d.method}</span>
      <div class="api-endpoint">${d.endpoint}</div>
      <div class="api-desc">${d.desc}</div>
      <div class="api-result" id="apiresult-${i}">Click to test</div>
    </div>`).join('');
}

async function callAPIDemo(idx) {
  const role = ROLE_CONFIG[currentRole];
  const demo = role.apiDemos[idx];
  const card = document.getElementById(`apicard-${idx}`);
  const res_el = document.getElementById(`apiresult-${idx}`);

  card.classList.add('calling');
  res_el.className = 'api-result';
  res_el.textContent = 'Calling...';

  const body = demo.method === 'POST' ? { action: 'TEST', substationId: 'SS-03' } : null;
  const res = await Api.call(demo.method, demo.endpoint.replace('/api', ''), body);
  card.classList.remove('calling');

  const code = res.status || 0;
  const cls = code === 200 ? 'r200' : code === 403 ? 'r403' : code === 401 ? 'r401' : code === 429 ? 'r429' : 'r401';
  const label = code === 0 ? '0 OFFLINE' : `${code} ${res.data?.error || (code === 200 ? 'OK' : 'DENIED')}`;
  res_el.className = `api-result ${cls}`;
  res_el.textContent = label;

  addLog(`${demo.method} ${demo.endpoint} → ${label}`, code === 200 ? 'ok' : 'denied');
}

async function testAPICall() {
  const res = await Api.getPower();
  if (res.ok) {
    toast(`API OK: Power load ${res.data.data?.totalLoad_MW || '?'} MW`, 'success');
    addLog('GET /api/infra/power → 200 OK', 'ok');
  } else {
    toast(`API ${res.status}: ${res.data?.message || res.data?.error}`, res.status === 0 ? 'warn' : 'error');
    addLog(`GET /api/infra/power → ${res.status} DENIED`, 'denied');
  }
}

// ─── Emergency ───────────────────────────────────────────────────────────
async function toggleEmergency() {
  if (!emergencyActive) {
    const res = await Api.declareEmergency({ zones: [1,2,3], reason: 'Manual declaration from dashboard' });
    if (!res.ok && res.status !== 0) { toast(res.data.message, 'error'); return; }
    emergencyActive = true;
    document.getElementById('emergGlobalBtn').classList.add('active');
    document.getElementById('emergBtnText').textContent = 'EMERGENCY ACTIVE';
    document.getElementById('emergBanner').classList.add('on');
    toast('Emergency declared! All responders notified via WebSocket.', 'error');
    addLog('EMERGENCY DECLARED — permissions elevated citywide', 'warn');
  } else {
    deactivateEmergency();
  }
}

async function deactivateEmergency() {
  const res = await Api.deactivateEmergency();
  if (!res.ok && res.status !== 0) { toast(res.data?.message || 'Error', 'error'); return; }
  emergencyActive = false;
  activeZones.clear();
  document.getElementById('emergGlobalBtn').classList.remove('active');
  document.getElementById('emergBtnText').textContent = 'DECLARE EMERGENCY';
  document.getElementById('emergBanner').classList.remove('on');
  ['ez1','ez2','ez3'].forEach(id => document.getElementById(id)?.classList.remove('active-zone'));
  renderSVGMap('dashGeoMap', currentRole, false, activeZones);
  toast('Emergency deactivated. Permissions reverted.', 'success');
  addLog('Emergency deactivated — normal permissions restored', 'ok');
}

async function toggleZone(zoneId) {
  const action = activeZones.has(zoneId) ? 'deactivate' : 'activate';
  const res = await Api.emergencyZone({ zoneId, action });
  if (!res.ok && res.status !== 0) { toast(res.data?.message, 'error'); return; }

  if (action === 'activate') {
    activeZones.add(zoneId);
    document.getElementById('ez'+zoneId)?.classList.add('active-zone');
    toast(`Zone ${zoneId} emergency activated!`, 'error');
    addLog(`Zone ${zoneId} emergency declared`, 'warn');
  } else {
    activeZones.delete(zoneId);
    document.getElementById('ez'+zoneId)?.classList.remove('active-zone');
    toast(`Zone ${zoneId} emergency cleared`, 'success');
    addLog(`Zone ${zoneId} emergency cleared`, 'ok');
  }

  if (!emergencyActive && activeZones.size > 0) {
    emergencyActive = true;
    document.getElementById('emergGlobalBtn').classList.add('active');
    document.getElementById('emergBtnText').textContent = 'EMERGENCY ACTIVE';
    document.getElementById('emergBanner').classList.add('on');
  }
  renderSVGMap('dashGeoMap', currentRole, false, activeZones);
}

// ─── Audit Log ───────────────────────────────────────────────────────────
function addLog(action, status = 'ok') {
  const list = document.getElementById('auditList');
  if (!list) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const labels = { ok:'ALLOW', denied:'DENY', warn:'WARN' };
  const entry = document.createElement('div');
  entry.className = 'alog';
  entry.innerHTML = `<span class="alog-time">${time}</span><span class="alog-action">${action}</span><span class="alog-status ${status}">${labels[status]||'OK'}</span>`;
  list.insertBefore(entry, list.firstChild);
  if (list.children.length > 25) list.removeChild(list.lastChild);
}

async function loadAuditLogs() {
  const res = await Api.getAuditLogs('?limit=20');
  if (res.ok) {
    res.data.logs.slice(0,10).forEach(l => {
      addLog(`[SERVER] ${l.action} ${l.resource} — ${l.userId||'?'}`, l.status === 'ALLOW' ? 'ok' : 'denied');
    });
    toast(`Loaded ${res.data.logs.length} server-side audit logs`, 'info');
  } else {
    toast('Audit logs require admin role + backend', 'warn');
  }
}

// ─── Session Timer ───────────────────────────────────────────────────────
function tickSession() {
  sessionSeconds--;
  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;
  document.getElementById('sessionTimer').textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct = (sessionSeconds / 14400) * 100;
  const bar = document.getElementById('sessionBar');
  bar.style.width = pct + '%';
  bar.style.background = pct > 50 ? '#00ff88' : pct > 20 ? '#ffc930' : '#ff2255';
  if (sessionSeconds <= 0)  { clearInterval(sessionInterval); doLogout(); }
  if (sessionSeconds === 300) toast('Session expires in 5 minutes!', 'warn');
}
