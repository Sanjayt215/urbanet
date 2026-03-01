// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { USERS, ACTIVE_SESSIONS, OTP_STORE, AUDIT_LOGS } = require("../config/db");
const { logAudit } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimiter");
const { verifyToken } = require("../middleware/auth");

// ─── POST /api/auth/generate-otp ─────────────────────────────────────────
// Generate a 6-digit OTP for a badge ID
router.post("/generate-otp", (req, res) => {
  const { badgeId } = req.body;
  if (!badgeId) return res.status(400).json({ success: false, message: "Badge ID required" });

  const user = USERS.find((u) => u.badgeId === badgeId);
  if (!user) {
    // Don't reveal if user exists - security best practice
    return res.json({ success: true, message: "If badge ID exists, OTP has been sent." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min expiry

  OTP_STORE.set(badgeId, { otp, expiresAt, attempts: 0 });

  // In production: send via SMS/email. Here we return it for demo.
  console.log(`[OTP] Badge: ${badgeId} → OTP: ${otp}`);

  res.json({
    success: true,
    message: "OTP generated (demo mode: returned in response)",
    otp, // REMOVE in production - only for hackathon demo
    expiresIn: 300,
  });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  const { badgeId, password, otp } = req.body;
  const clientIp = req.ip;

  // 1. Validate input
  if (!badgeId || !password || !otp) {
    return res.status(400).json({
      success: false,
      error: "MISSING_FIELDS",
      message: "Badge ID, password, and OTP are required.",
    });
  }

  // 2. Find user
  const user = USERS.find((u) => u.badgeId === badgeId);
  if (!user) {
    logAudit(badgeId, "LOGIN", "Unknown badge ID", clientIp, "DENIED");
    return res.status(401).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: "Invalid credentials.",
    });
  }

  // 3. Check if account is active
  if (!user.isActive) {
    logAudit(badgeId, "LOGIN", "Deactivated account attempt", clientIp, "DENIED");
    return res.status(403).json({
      success: false,
      error: "ACCOUNT_DISABLED",
      message: "Account is deactivated. Contact your administrator.",
    });
  }

  // 4. Check failed attempts (lockout after 5)
  if (user.failedAttempts >= 5) {
    logAudit(badgeId, "LOGIN", "Account locked - too many failed attempts", clientIp, "DENIED");
    return res.status(403).json({
      success: false,
      error: "ACCOUNT_LOCKED",
      message: "Account locked due to too many failed attempts. Contact admin.",
    });
  }

  // 5. Verify password (bcrypt)
  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    user.failedAttempts++;
    logAudit(badgeId, "LOGIN", "Invalid password", clientIp, "DENIED");
    return res.status(401).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: `Invalid credentials. ${5 - user.failedAttempts} attempts remaining.`,
    });
  }

  // 6. Verify OTP
  const otpRecord = OTP_STORE.get(badgeId);
  if (!otpRecord) {
    logAudit(badgeId, "LOGIN", "OTP not generated", clientIp, "DENIED");
    return res.status(401).json({
      success: false,
      error: "OTP_NOT_FOUND",
      message: "OTP not found. Please generate a new OTP first.",
    });
  }
  if (Date.now() > otpRecord.expiresAt) {
    OTP_STORE.delete(badgeId);
    logAudit(badgeId, "LOGIN", "OTP expired", clientIp, "DENIED");
    return res.status(401).json({
      success: false,
      error: "OTP_EXPIRED",
      message: "OTP has expired. Please generate a new one.",
    });
  }
  if (otpRecord.otp !== otp.trim()) {
    otpRecord.attempts++;
    logAudit(badgeId, "LOGIN", "Invalid OTP", clientIp, "DENIED");
    return res.status(401).json({
      success: false,
      error: "INVALID_OTP",
      message: "Invalid OTP. Please try again.",
    });
  }

  // 7. All checks passed — issue JWT
  user.failedAttempts = 0;
  user.lastLogin = new Date().toISOString();
  OTP_STORE.delete(badgeId);

  const jti = uuidv4(); // unique token ID for blacklisting
  const token = jwt.sign(
    {
      jti,
      sub: user.id,
      badgeId: user.badgeId,
      name: user.name,
      role: user.role,
      zone: user.zone,
      clearance: user.clearance,
      department: user.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "4h" }
  );

  // 8. Register session (Redis simulation)
  ACTIVE_SESSIONS.set(jti, {
    userId: user.id,
    badgeId: user.badgeId,
    role: user.role,
    loginAt: new Date().toISOString(),
    ip: clientIp,
    jti,
  });

  // 9. Compute risk score
  const hour = new Date().getHours();
  const riskScore = computeRiskScore(hour, user.role);

  logAudit(user.badgeId, "LOGIN", "Successful authentication", clientIp, "ALLOW", {
    role: user.role,
    jti,
    riskScore,
  });

  res.json({
    success: true,
    message: "Authentication successful",
    token,
    user: {
      id: user.id,
      badgeId: user.badgeId,
      name: user.name,
      role: user.role,
      zone: user.zone,
      clearance: user.clearance,
      department: user.department,
      email: user.email,
      lastLogin: user.lastLogin,
    },
    session: { jti, expiresIn: "4h", loginAt: new Date().toISOString() },
    riskScore,
  });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────
router.post("/logout", verifyToken, (req, res) => {
  const { jti, badgeId } = req.user;
  ACTIVE_SESSIONS.delete(jti); // blacklist token
  logAudit(badgeId, "LOGOUT", "Session terminated", req.ip, "ALLOW", { jti });
  res.json({ success: true, message: "Logged out. Session token blacklisted." });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────
router.get("/me", verifyToken, (req, res) => {
  const user = USERS.find((u) => u.badgeId === req.user.badgeId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({
    success: true,
    user: {
      id: user.id, badgeId: user.badgeId, name: user.name,
      role: user.role, zone: user.zone, clearance: user.clearance,
      department: user.department, email: user.email, lastLogin: user.lastLogin,
    },
  });
});

// ─── GET /api/auth/sessions ───────────────────────────────────────────────
router.get("/sessions", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "FORBIDDEN" });
  }
  const sessions = Array.from(ACTIVE_SESSIONS.values());
  res.json({ success: true, count: sessions.length, sessions });
});

// ─── Helper: Risk Score ──────────────────────────────────────────────────
function computeRiskScore(hour, role) {
  const timeScore   = hour >= 8 && hour <= 20 ? 95 : 40;
  const locationScore = 70 + Math.floor(Math.random() * 25);
  const deviceScore   = 60 + Math.floor(Math.random() * 35);
  const velocityScore = 85 + Math.floor(Math.random() * 15);
  return {
    overall: Math.floor((timeScore + locationScore + deviceScore + velocityScore) / 4),
    breakdown: { timeScore, locationScore, deviceScore, velocityScore },
    level: timeScore < 60 || locationScore < 60 ? "HIGH_RISK" : "LOW_RISK",
  };
}

module.exports = router;
