// routes/infrastructure.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole, requireClearance, requireZoneAccess, logAudit } = require("../middleware/auth");
const { dynamicLimiter } = require("../middleware/rateLimiter");
const { EMERGENCY_STATE } = require("../config/db");

// All routes require auth + dynamic rate limiting + zone enforcement
router.use(verifyToken, dynamicLimiter, requireZoneAccess);

// ─── Mock live data generators ────────────────────────────────────────────
const mockPower = (zone = null) => ({
  timestamp: new Date().toISOString(),
  zone: zone || "ALL",
  totalLoad_MW: (800 + Math.random() * 400).toFixed(1),
  frequency_Hz: (49.8 + Math.random() * 0.4).toFixed(2),
  voltage_kV: (220 + Math.random() * 10).toFixed(1),
  renewablePercent: (30 + Math.random() * 20).toFixed(1),
  substations: [
    { id: "SS-01", zone: 1, status: "ONLINE", load_MW: (150 + Math.random() * 50).toFixed(1) },
    { id: "SS-02", zone: 2, status: "ONLINE", load_MW: (200 + Math.random() * 80).toFixed(1) },
    { id: "SS-03", zone: 3, status: Math.random() > 0.9 ? "WARNING" : "ONLINE", load_MW: (180 + Math.random() * 60).toFixed(1) },
  ],
  alerts: Math.random() > 0.8 ? [{ id: "ALT-001", msg: "High load at substation SS-02", severity: "WARN" }] : [],
});

const mockWater = (zone = null) => ({
  timestamp: new Date().toISOString(),
  zone: zone || "ALL",
  reservoirLevel_percent: (65 + Math.random() * 25).toFixed(1),
  flowRate_MLD: (450 + Math.random() * 100).toFixed(1),
  pressure_bar: (3.2 + Math.random() * 0.8).toFixed(2),
  qualityIndex: (92 + Math.random() * 7).toFixed(1),
  pumps: [
    { id: "PMP-01", zone: 1, status: "RUNNING", rpm: Math.floor(1400 + Math.random() * 200) },
    { id: "PMP-02", zone: 2, status: "RUNNING", rpm: Math.floor(1400 + Math.random() * 200) },
    { id: "PMP-03", zone: 3, status: Math.random() > 0.85 ? "STANDBY" : "RUNNING", rpm: Math.floor(1200 + Math.random() * 300) },
  ],
  alerts: [],
});

const mockTraffic = () => ({
  timestamp: new Date().toISOString(),
  avgCongestion_percent: (30 + Math.random() * 40).toFixed(1),
  activeSignals: 312,
  incidents: Math.floor(Math.random() * 5),
  zones: [
    { id: 1, name: "North", congestion: (20 + Math.random() * 30).toFixed(1), signals: 104 },
    { id: 2, name: "Central", congestion: (40 + Math.random() * 40).toFixed(1), signals: 128 },
    { id: 3, name: "South", congestion: (25 + Math.random() * 35).toFixed(1), signals: 80 },
  ],
});

const mockSensors = (zone = null) => {
  const count = zone ? 38 : 247;
  return {
    timestamp: new Date().toISOString(),
    zone: zone || "ALL",
    totalSensors: count,
    online: count - Math.floor(Math.random() * 3),
    sensors: Array.from({ length: Math.min(count, 10) }, (_, i) => ({
      id: `SNS-${String(i + 1).padStart(3, "0")}`,
      type: ["TEMP", "PRESSURE", "FLOW", "AIR_QUALITY"][i % 4],
      zone: zone || Math.ceil(Math.random() * 3),
      value: (20 + Math.random() * 80).toFixed(2),
      unit: ["°C", "bar", "m³/h", "AQI"][i % 4],
      status: Math.random() > 0.95 ? "WARNING" : "ONLINE",
      lastUpdate: new Date(Date.now() - Math.random() * 60000).toISOString(),
    })),
  };
};

// ═══════════════════════════════════════════════════════════
// POWER GRID ENDPOINTS
// ═══════════════════════════════════════════════════════════

// GET /api/infra/power — all roles can read (different scope)
router.get("/power", (req, res) => {
  const { role, zone } = req.user;
  logAudit(req.user.badgeId, "READ", "/api/infra/power", req.ip, "ALLOW", { role });

  if (role === "analyst") {
    // Analysts get aggregated data only
    const data = mockPower();
    return res.json({
      success: true,
      scope: "AGGREGATED",
      note: "Aggregated data only — individual sensor details restricted",
      data: {
        totalLoad_MW: data.totalLoad_MW,
        renewablePercent: data.renewablePercent,
        timestamp: data.timestamp,
        zones_summary: data.substations.map((s) => ({ zone: s.zone, load_MW: s.load_MW })),
      },
    });
  }

  if (role === "engineer") {
    return res.json({ success: true, scope: "ZONE-3", data: mockPower(3) });
  }

  res.json({ success: true, scope: "ALL_ZONES", data: mockPower() });
});

// POST /api/infra/power/control — engineer (own zone) + admin only
router.post("/power/control", requireRole("admin", "engineer"), (req, res) => {
  const { action, substationId, value } = req.body;
  const { role, zone, badgeId } = req.user;

  // Engineers can only control Zone 3
  if (role === "engineer" && substationId && !substationId.startsWith("SS-03")) {
    logAudit(badgeId, "WRITE", `/api/infra/power/control`, req.ip, "DENIED", { reason: "Zone restriction" });
    return res.status(403).json({
      success: false,
      error: "ZONE_RESTRICTED",
      message: "Engineers can only control Zone 3 substations.",
    });
  }

  logAudit(badgeId, "WRITE", "/api/infra/power/control", req.ip, "ALLOW", { action, substationId });
  res.json({
    success: true,
    message: `Power control command executed`,
    command: { action, substationId, value, executedBy: badgeId, at: new Date().toISOString() },
  });
});

// ═══════════════════════════════════════════════════════════
// WATER NETWORK ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get("/water", (req, res) => {
  const { role, badgeId } = req.user;
  logAudit(badgeId, "READ", "/api/infra/water", req.ip, "ALLOW", { role });

  if (role === "analyst") {
    const data = mockWater();
    return res.json({
      success: true, scope: "AGGREGATED",
      data: { reservoirLevel_percent: data.reservoirLevel_percent, flowRate_MLD: data.flowRate_MLD, timestamp: data.timestamp },
    });
  }
  if (role === "engineer") return res.json({ success: true, scope: "ZONE-3", data: mockWater(3) });
  res.json({ success: true, scope: "ALL_ZONES", data: mockWater() });
});

router.post("/water/control", requireRole("admin", "engineer", "emergency"), (req, res) => {
  const { action, pumpId } = req.body;
  const { role, badgeId } = req.user;
  if (role === "engineer" && pumpId && !pumpId.startsWith("PMP-03")) {
    return res.status(403).json({ success: false, error: "ZONE_RESTRICTED", message: "Zone 3 only." });
  }
  logAudit(badgeId, "WRITE", "/api/infra/water/control", req.ip, "ALLOW", { action, pumpId });
  res.json({ success: true, message: "Water control command executed", command: { action, pumpId, executedBy: badgeId } });
});

// ═══════════════════════════════════════════════════════════
// TRAFFIC CONTROL ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get("/traffic", (req, res) => {
  logAudit(req.user.badgeId, "READ", "/api/infra/traffic", req.ip, "ALLOW");
  res.json({ success: true, data: mockTraffic() });
});

// Write: admin + emergency only
router.post("/traffic/signal", requireRole("admin", "emergency"), (req, res) => {
  const { signalId, action, duration } = req.body;
  logAudit(req.user.badgeId, "WRITE", "/api/infra/traffic/signal", req.ip, "ALLOW", { signalId, action });
  res.json({ success: true, message: "Signal control executed", command: { signalId, action, duration, executedBy: req.user.badgeId } });
});

// ═══════════════════════════════════════════════════════════
// IOT SENSOR ENDPOINTS
// ═══════════════════════════════════════════════════════════

router.get("/sensors", (req, res) => {
  const { role, badgeId } = req.user;
  logAudit(badgeId, "READ", "/api/infra/sensors", req.ip, "ALLOW", { role });

  if (role === "analyst") return res.json({ success: true, scope: "PUBLIC_AGG", data: mockSensors() });
  if (role === "engineer") return res.json({ success: true, scope: "ZONE-3", data: mockSensors(3) });
  res.json({ success: true, scope: "ALL", data: mockSensors() });
});

// ═══════════════════════════════════════════════════════════
// SYSTEM CONFIG — Admin only, L5 clearance
// ═══════════════════════════════════════════════════════════

router.get("/system/config", requireRole("admin"), requireClearance(5), (req, res) => {
  logAudit(req.user.badgeId, "READ", "/api/infra/system/config", req.ip, "ALLOW");
  res.json({
    success: true,
    config: {
      systemVersion: "2.4.1",
      nodes: 247,
      uptime: "99.94%",
      backupStatus: "COMPLETED",
      lastAudit: new Date(Date.now() - 86400000).toISOString(),
      apiVersion: "v1",
    },
  });
});

module.exports = router;
