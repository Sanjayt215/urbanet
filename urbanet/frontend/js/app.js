// js/app.js — App initialization, WebSocket, utilities
let socket = null;

// ─── Toast ───────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ─── Clock ───────────────────────────────────────────────────────────────
setInterval(() => {
  const now = new Date();
  const el = document.getElementById('liveClock');
  if (el) el.textContent = now.toLocaleTimeString('en-IN');
}, 1000);

// ─── API Health Check ─────────────────────────────────────────────────────
async function checkAPIHealth() {
  const data = await Api.health();
  const badge = document.getElementById('apiBadge');
  const pill  = document.getElementById('sysStatus');
  if (data && data.status === 'ONLINE') {
    badge.textContent = 'API: ONLINE';
    badge.classList.add('online');
    if (pill) pill.textContent = 'BACKEND CONNECTED';
  } else {
    badge.textContent = 'API: OFFLINE';
    badge.classList.remove('online');
    if (pill) pill.textContent = 'DEMO MODE (no backend)';
  }
}
checkAPIHealth();
setInterval(checkAPIHealth, 15000);

// ─── WebSocket ────────────────────────────────────────────────────────────
function initSocket() {
  try {
    socket = io('http://localhost:5000');

    socket.on('connect', () => {
      socket.emit('join:role', currentRole);
      addLog('WebSocket connected — live sensor feed active', 'ok');
    });

    socket.on('sensor:update', (data) => {
      const pwEl = document.getElementById('swPower');
      const frEl = document.getElementById('swFreq');
      const flEl = document.getElementById('swFlow');
      const trEl = document.getElementById('swTraffic');
      if (pwEl) pwEl.textContent = data.power?.load + ' MW';
      if (frEl) frEl.textContent = data.power?.frequency + ' Hz';
      if (flEl) flEl.textContent = data.water?.flow + ' MLD';
      if (trEl) trEl.textContent = data.traffic?.congestion + ' %';
    });

    socket.on('emergency:declared', (data) => {
      toast('EMERGENCY DECLARED by another user!', 'error');
      document.getElementById('emergBanner').classList.add('on');
      document.getElementById('emergMsg').textContent = data.message;
      document.getElementById('emergGlobalBtn').classList.add('active');
      document.getElementById('emergBtnText').textContent = 'EMERGENCY ACTIVE';
      emergencyActive = true;
      addLog(`[WS] ${data.message}`, 'warn');
    });

    socket.on('emergency:deactivated', (data) => {
      toast('Emergency deactivated by admin', 'success');
      document.getElementById('emergBanner').classList.remove('on');
      document.getElementById('emergGlobalBtn').classList.remove('active');
      document.getElementById('emergBtnText').textContent = 'DECLARE EMERGENCY';
      emergencyActive = false;
      addLog(`[WS] ${data.message}`, 'ok');
    });

    socket.on('emergency:zone_update', (data) => {
      if (data.action === 'activate') {
        activeZones.add(data.zoneId);
        document.getElementById('ez'+data.zoneId)?.classList.add('active-zone');
      } else {
        activeZones.delete(data.zoneId);
        document.getElementById('ez'+data.zoneId)?.classList.remove('active-zone');
      }
      renderSVGMap('dashGeoMap', currentRole, false, activeZones);
      addLog(`[WS] Zone ${data.zoneId} ${data.action}d by ${data.updatedBy}`, 'warn');
    });

    socket.on('disconnect', () => {
      addLog('WebSocket disconnected', 'warn');
    });
  } catch(e) {
    // socket.io not available (no backend)
    console.log('WebSocket unavailable — backend may be offline');
  }
}

function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

// ─── Keyboard shortcut ───────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('loginView').classList.contains('active')) {
    attemptLogin();
  }
});

// ─── Risk score on input ─────────────────────────────────────────────────
['fBadge','fPass','fOTP'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', computeRiskScore);
});

// Init risk score
computeRiskScore();
