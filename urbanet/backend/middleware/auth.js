// middleware/auth.js
const jwt = require("jsonwebtoken");
const { ACTIVE_SESSIONS, AUDIT_LOGS } = require("../config/db");

// ─── Verify JWT Token ───────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    logAudit(null, "AUTH", "Token missing", req.ip, "DENIED");
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      message: "Access token required. Please login first.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session is still active (Redis blacklist simulation)
    if (!ACTIVE_SESSIONS.has(decoded.jti)) {
      logAudit(decoded.badgeId, "AUTH", "Session expired or logged out", req.ip, "DENIED");
      return res.status(401).json({
        success: false,
        error: "SESSION_EXPIRED",
        message: "Session expired or terminated. Please login again.",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    logAudit(null, "AUTH", `Invalid token: ${err.message}`, req.ip, "DENIED");
    return res.status(403).json({
      success: false,
      error: "INVALID_TOKEN",
      message: "Token is invalid or expired.",
    });
  }
};

// ─── Role Guard ─────────────────────────────────────────────────────────────
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAudit(
        req.user.badgeId,
        "ACCESS",
        `Role ${req.user.role} attempted to access ${req.path} (requires: ${allowedRoles.join(", ")})`,
        req.ip,
        "DENIED"
      );
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
        yourRole: req.user.role,
        requiredRoles: allowedRoles,
      });
    }
    next();
  };
};

// ─── Clearance Level Guard ──────────────────────────────────────────────────
const CLEARANCE_LEVELS = { analyst: 2, engineer: 3, emergency: 4, admin: 5 };

const requireClearance = (minLevel) => {
  return (req, res, next) => {
    const userLevel = CLEARANCE_LEVELS[req.user.role] || 0;
    if (userLevel < minLevel) {
      logAudit(
        req.user.badgeId,
        "CLEARANCE",
        `Clearance L${userLevel} insufficient for L${minLevel} resource at ${req.path}`,
        req.ip,
        "DENIED"
      );
      return res.status(403).json({
        success: false,
        error: "INSUFFICIENT_CLEARANCE",
        message: `Clearance Level ${minLevel} required. Your clearance: L${userLevel}`,
      });
    }
    next();
  };
};

// ─── Audit Logger ────────────────────────────────────────────────────────────
const logAudit = (userId, action, resource, ip, status, extra = {}) => {
  const entry = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    ip: ip || "unknown",
    status,
    ...extra,
  };
  AUDIT_LOGS.unshift(entry);
  if (AUDIT_LOGS.length > 500) AUDIT_LOGS.pop(); // keep last 500
  return entry;
};

// ─── Request Logger Middleware ───────────────────────────────────────────────
const requestLogger = (req, res, next) => {
  if (req.user) {
    logAudit(
      req.user.badgeId,
      req.method,
      req.path,
      req.ip,
      "ALLOW",
      { role: req.user.role }
    );
  }
  next();
};

// ─── Zone Guard — engineer can only access their assigned zone ──────────────
const requireZoneAccess = (req, res, next) => {
  const { role, zone } = req.user;
  // Admin, emergency, analyst have cross-zone access
  if (role !== 'engineer') return next();

  const requestedZone = parseInt(req.query.zone || req.body?.zone || req.params?.zone);
  if (requestedZone && requestedZone !== zone) {
    logAudit(req.user.badgeId, 'ACCESS', `Zone ${requestedZone} denied — engineer assigned to Zone ${zone}`, req.ip, 'DENIED');
    return res.status(403).json({
      success: false,
      error: 'ZONE_RESTRICTED',
      message: `Access denied. You are assigned to Zone ${zone} only.`,
      yourZone: zone,
      requestedZone,
    });
  }
  next();
};

module.exports = { verifyToken, requireRole, requireClearance, requireZoneAccess, logAudit, requestLogger };
