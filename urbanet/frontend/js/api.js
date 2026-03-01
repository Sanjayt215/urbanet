// js/api.js — API service layer with real HTTP calls
let authToken = null;

const Api = {
  setToken(t) { authToken = t; },
  clearToken() { authToken = null; },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      return { status: res.status, data, ok: res.ok };
    } catch (err) {
      return { status: 0, data: { error: 'NETWORK_ERROR', message: err.message }, ok: false };
    }
  },

  // Auth
  generateOTP: (badgeId)       => Api.request('POST', '/auth/generate-otp', { badgeId }),
  login:       (body)          => Api.request('POST', '/auth/login',         body),
  logout:      ()              => Api.request('POST', '/auth/logout'),
  getMe:       ()              => Api.request('GET',  '/auth/me'),

  // Infrastructure
  getPower:    ()              => Api.request('GET',  '/infra/power'),
  getWater:    ()              => Api.request('GET',  '/infra/water'),
  getTraffic:  ()              => Api.request('GET',  '/infra/traffic'),
  getSensors:  ()              => Api.request('GET',  '/infra/sensors'),
  controlPower:(body)          => Api.request('POST', '/infra/power/control', body),
  controlSignal:(body)         => Api.request('POST', '/infra/traffic/signal', body),

  // Emergency
  emergencyStatus: ()          => Api.request('GET',  '/emergency/status'),
  declareEmergency:(body)      => Api.request('POST', '/emergency/declare',    body),
  deactivateEmergency:()       => Api.request('POST', '/emergency/deactivate'),
  emergencyZone:(body)         => Api.request('POST', '/emergency/zone',       body),

  // Admin
  getUsers:    ()              => Api.request('GET',  '/admin/users'),
  getAuditLogs:(params = '')   => Api.request('GET',  `/admin/audit-logs${params}`),
  getSessions: ()              => Api.request('GET',  '/admin/sessions'),

  // Health
  health: () => fetch(`${API_BASE}/health`).then(r => r.json()).catch(() => null),

  // Generic call for demo panel
  call: (method, path, body) => Api.request(method, path, body),
};
