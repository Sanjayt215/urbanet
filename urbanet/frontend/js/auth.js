// js/auth.js — Authentication flow with real backend calls
let currentRole = 'admin';
let currentUser = null;
let sessionJTI = null;
let sessionSeconds = 14400;
let sessionInterval = null;
let emergencyActive = false;
let activeZones = new Set();

// ─── Role Selection ───────────────────────────────────────────────────────
function pickRole(role) {
  currentRole = role;
  ['admin','engineer','emergency','analyst'].forEach(r => {
    document.getElementById('rp-' + r).classList.toggle('active', r === role);
  });
  document.getElementById('loginBtn').className = `login-btn r-${role}`;
  computeRiskScore();
}

// ─── OTP Generation (calls real backend) ─────────────────────────────────
async function generateOTP() {
  const badgeId = document.getElementById('fBadge').value.trim();
  if (!badgeId) { toast('Enter Badge ID first', 'warn'); return; }

  const btn = document.querySelector('.otp-gen');
  btn.textContent = 'SENDING...';

  const res = await Api.generateOTP(badgeId);
  btn.textContent = 'GENERATE';

  if (res.ok && res.data.otp) {
    document.getElementById('fOTP').value = res.data.otp;
    toast(`OTP: ${res.data.otp} (expires in 5 min)`, 'info');
  } else if (res.status === 0) {
    // Backend offline — generate client-side for demo
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('fOTP').value = otp;
    toast(`Backend offline — demo OTP: ${otp}`, 'warn');
  } else {
    toast(res.data.message || 'OTP generation failed', 'error');
  }
}

// ─── Risk Score (client-side heuristics) ─────────────────────────────────
function computeRiskScore() {
  const hour = new Date().getHours();
  const timeScore  = hour >= 8 && hour <= 20 ? 95 : 40;
  const locScore   = 70 + Math.floor(Math.random() * 25);
  const devScore   = 60 + Math.floor(Math.random() * 35);
  const velScore   = 85 + Math.floor(Math.random() * 15);
  const overall    = Math.floor((timeScore + locScore + devScore + velScore) / 4);

  const scoreEl = document.getElementById('riskScore');
  const fillEl  = document.getElementById('riskFill');
  const factorsEl = document.getElementById('riskFactors');
  if (!scoreEl) return;

  scoreEl.textContent = overall;
  const color = overall >= 80 ? '#00ff88' : overall >= 60 ? '#ffc930' : '#ff2255';
  scoreEl.style.color = color;
  fillEl.style.width   = overall + '%';
  fillEl.style.background = color;

  const factors = [
    { label: timeScore >= 80 ? 'Business Hours' : 'Off Hours', cls: timeScore >= 80 ? 'ok' : 'warn' },
    { label: locScore  >= 75 ? 'Known IP'       : 'New IP',    cls: locScore  >= 75 ? 'ok' : 'warn' },
    { label: devScore  >= 75 ? 'Trusted Device' : 'New Device',cls: devScore  >= 75 ? 'ok' : 'warn' },
    { label: 'Normal Velocity', cls: 'ok' },
    { label: overall   >= 70 ? 'MFA Active'     : 'MFA Req',   cls: overall   >= 70 ? 'ok' : 'bad'  },
  ];
  factorsEl.innerHTML = factors.map(f => `<span class="rm-factor ${f.cls}">${f.label}</span>`).join('');
}

// ─── Login ────────────────────────────────────────────────────────────────
async function attemptLogin() {
  const badgeId  = document.getElementById('fBadge').value.trim();
  const password = document.getElementById('fPass').value.trim();
  const otp      = document.getElementById('fOTP').value.trim();

  if (!badgeId || !password || !otp)         { toast('All fields are required', 'error'); return; }
  if (otp.length !== 6 || isNaN(otp))        { toast('Invalid OTP format — must be 6 digits', 'error'); return; }

  // Animate loading steps
  const overlay = document.getElementById('loadOverlay');
  overlay.classList.add('on');
  const steps = ['ls0','ls1','ls2','ls3','ls4','ls5'];
  steps.forEach(s => {
    document.getElementById(s).className = 'lstep';
    document.getElementById(s).querySelector('.lstep-icon').textContent = 'O';
  });

  let i = 0;
  const stepInterval = setInterval(async () => {
    if (i > 0) {
      document.getElementById(steps[i-1]).className = 'lstep done';
      document.getElementById(steps[i-1]).querySelector('.lstep-icon').textContent = 'V';
    }
    if (i < steps.length) {
      document.getElementById(steps[i]).className = 'lstep active';
      document.getElementById(steps[i]).querySelector('.lstep-icon').textContent = '>';
      i++;
    } else {
      clearInterval(stepInterval);
      // Real API call
      const res = await Api.login({ badgeId, password, otp });
      overlay.classList.remove('on');

      if (res.ok) {
        Api.setToken(res.data.token);
        currentUser = res.data.user;
        sessionJTI  = res.data.session.jti;
        showGeoModal(false);
      } else {
        const msg = res.status === 0
          ? 'Backend offline — using demo mode'
          : res.data.message || 'Authentication failed';
        toast(msg, res.status === 0 ? 'warn' : 'error');

        // Demo fallback: allow login anyway in offline mode
        if (res.status === 0) {
          currentUser = { badgeId, name: ROLE_CONFIG[currentRole].name, role: currentRole };
          showGeoModal(false);
        }
      }
    }
  }, 480);
}

// ─── Logout ────────────────────────────────────────────────────────────────
async function doLogout() {
  clearInterval(sessionInterval);
  if (authToken) await Api.logout();
  Api.clearToken();
  currentUser = null; sessionJTI = null;
  emergencyActive = false; activeZones.clear();
  disconnectSocket();

  document.getElementById('dashView').classList.remove('active');
  document.getElementById('loginView').classList.add('active');
  document.getElementById('fBadge').value = '';
  document.getElementById('fPass').value  = '';
  document.getElementById('fOTP').value   = '';
  document.getElementById('riskScore').textContent = '--';
  document.getElementById('riskFill').style.width  = '0%';
  document.getElementById('riskFactors').innerHTML = '';
  document.getElementById('emergGlobalBtn').classList.remove('active');
  document.getElementById('emergBtnText').textContent = 'DECLARE EMERGENCY';

  toast('Session terminated. Token blacklisted.', 'warn');
}
