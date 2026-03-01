// routes/emergency.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole, logAudit } = require("../middleware/auth");
const { EMERGENCY_STATE, AUDIT_LOGS } = require("../config/db");

let _io = null;
const setIO = (io) => { _io = io; };

router.use(verifyToken);

// ─── GET /api/emergency/status ───────────────────────────────────────────
router.get("/status", (req, res) => {
  res.json({ success: true, emergency: EMERGENCY_STATE });
});

// ─── POST /api/emergency/declare ─────────────────────────────────────────
// Admin or Emergency role can declare
router.post("/declare", requireRole("admin", "emergency"), (req, res) => {
  const { zones, reason } = req.body;
  const { badgeId, name, role } = req.user;

  if (EMERGENCY_STATE.active) {
    return res.status(409).json({ success: false, error: "ALREADY_ACTIVE", message: "Emergency already active." });
  }

  EMERGENCY_STATE.active = true;
  EMERGENCY_STATE.declaredBy = { badgeId, name, role };
  EMERGENCY_STATE.declaredAt = new Date().toISOString();
  EMERGENCY_STATE.activeZones = zones || [1, 2, 3];
  EMERGENCY_STATE.reason = reason || "Manual declaration";

  logAudit(badgeId, "EMERGENCY_DECLARE", "City-wide emergency declared", req.ip, "ALLOW", {
    zones: EMERGENCY_STATE.activeZones, reason
  });

  // Broadcast to all connected clients via WebSocket
  if (_io) {
    _io.emit("emergency:declared", {
      emergency: EMERGENCY_STATE,
      message: `EMERGENCY declared by ${name} (${role})`,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true, message: "Emergency declared. All users notified.", emergency: EMERGENCY_STATE });
});

// ─── POST /api/emergency/deactivate ──────────────────────────────────────
router.post("/deactivate", requireRole("admin"), (req, res) => {
  const { badgeId, name } = req.user;

  if (!EMERGENCY_STATE.active) {
    return res.status(409).json({ success: false, error: "NOT_ACTIVE", message: "No active emergency." });
  }

  const prev = { ...EMERGENCY_STATE };
  EMERGENCY_STATE.active = false;
  EMERGENCY_STATE.declaredBy = null;
  EMERGENCY_STATE.declaredAt = null;
  EMERGENCY_STATE.activeZones = [];
  EMERGENCY_STATE.deactivatedBy = { badgeId, name };
  EMERGENCY_STATE.deactivatedAt = new Date().toISOString();

  logAudit(badgeId, "EMERGENCY_DEACTIVATE", "Emergency deactivated", req.ip, "ALLOW");

  if (_io) {
    _io.emit("emergency:deactivated", {
      message: `Emergency deactivated by ${name}`,
      deactivatedBy: badgeId,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true, message: "Emergency deactivated.", previous: prev });
});

// ─── POST /api/emergency/zone ────────────────────────────────────────────
router.post("/zone", requireRole("admin", "emergency"), (req, res) => {
  const { zoneId, action } = req.body; // action: "activate" | "deactivate"
  const { badgeId, name } = req.user;

  if (action === "activate" && !EMERGENCY_STATE.activeZones.includes(zoneId)) {
    EMERGENCY_STATE.activeZones.push(zoneId);
    if (!EMERGENCY_STATE.active) {
      EMERGENCY_STATE.active = true;
      EMERGENCY_STATE.declaredBy = { badgeId, name };
      EMERGENCY_STATE.declaredAt = new Date().toISOString();
    }
  } else if (action === "deactivate") {
    EMERGENCY_STATE.activeZones = EMERGENCY_STATE.activeZones.filter((z) => z !== zoneId);
    if (EMERGENCY_STATE.activeZones.length === 0) EMERGENCY_STATE.active = false;
  }

  logAudit(badgeId, "EMERGENCY_ZONE", `Zone ${zoneId} ${action}`, req.ip, "ALLOW");

  if (_io) {
    _io.emit("emergency:zone_update", {
      zoneId, action, activeZones: EMERGENCY_STATE.activeZones,
      updatedBy: badgeId, timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true, emergency: EMERGENCY_STATE });
});

// ─── GET /api/emergency/incidents ────────────────────────────────────────
router.get("/incidents", requireRole("admin", "emergency"), (req, res) => {
  const incidents = [
    { id: "INC-001", type: "FIRE", zone: 2, status: "ACTIVE", reportedAt: new Date(Date.now() - 1200000).toISOString(), units: 3 },
    { id: "INC-002", type: "FLOOD", zone: 3, status: "MONITORING", reportedAt: new Date(Date.now() - 3600000).toISOString(), units: 2 },
    { id: "INC-003", type: "POWER_OUTAGE", zone: 1, status: "RESOLVED", reportedAt: new Date(Date.now() - 7200000).toISOString(), units: 0 },
  ];
  res.json({ success: true, count: incidents.length, incidents });
});

module.exports = router;
module.exports.setIO = setIO;
