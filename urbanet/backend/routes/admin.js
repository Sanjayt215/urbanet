// routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { verifyToken, requireRole, logAudit } = require("../middleware/auth");
const { USERS, AUDIT_LOGS, ACTIVE_SESSIONS } = require("../config/db");

router.use(verifyToken, requireRole("admin"));

// ─── GET /api/admin/users ─────────────────────────────────────────────────
router.get("/users", (req, res) => {
  logAudit(req.user.badgeId, "READ", "/api/admin/users", req.ip, "ALLOW");
  const safe = USERS.map(({ password, ...u }) => u);
  res.json({ success: true, count: safe.length, users: safe });
});

// ─── PUT /api/admin/users/:badgeId/toggle ─────────────────────────────────
router.put("/users/:badgeId/toggle", (req, res) => {
  const user = USERS.find((u) => u.badgeId === req.params.badgeId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  user.isActive = !user.isActive;
  logAudit(req.user.badgeId, "UPDATE", `User ${req.params.badgeId} ${user.isActive ? "activated" : "deactivated"}`, req.ip, "ALLOW");
  res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}`, isActive: user.isActive });
});

// ─── PUT /api/admin/users/:badgeId/reset-lockout ──────────────────────────
router.put("/users/:badgeId/reset-lockout", (req, res) => {
  const user = USERS.find((u) => u.badgeId === req.params.badgeId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  user.failedAttempts = 0;
  logAudit(req.user.badgeId, "UPDATE", `Lockout reset for ${req.params.badgeId}`, req.ip, "ALLOW");
  res.json({ success: true, message: "Account unlocked." });
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────
router.get("/audit-logs", (req, res) => {
  const { role, status, limit = 50, offset = 0 } = req.query;
  let logs = [...AUDIT_LOGS];
  if (role)   logs = logs.filter((l) => l.role === role);
  if (status) logs = logs.filter((l) => l.status === status);
  logAudit(req.user.badgeId, "READ", "/api/admin/audit-logs", req.ip, "ALLOW");
  res.json({
    success: true,
    total: logs.length,
    logs: logs.slice(Number(offset), Number(offset) + Number(limit)),
  });
});

// ─── GET /api/admin/sessions ──────────────────────────────────────────────
router.get("/sessions", (req, res) => {
  const sessions = Array.from(ACTIVE_SESSIONS.values());
  res.json({ success: true, count: sessions.length, sessions });
});

// ─── DELETE /api/admin/sessions/:jti ─────────────────────────────────────
router.delete("/sessions/:jti", (req, res) => {
  const { jti } = req.params;
  if (!ACTIVE_SESSIONS.has(jti)) return res.status(404).json({ success: false, message: "Session not found" });
  ACTIVE_SESSIONS.delete(jti);
  logAudit(req.user.badgeId, "DELETE", `Force logout session ${jti}`, req.ip, "ALLOW");
  res.json({ success: true, message: "Session terminated." });
});

module.exports = router;
