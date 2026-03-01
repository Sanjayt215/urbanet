// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// ─── Generic rate limiter factory ──────────────────────────────────────────
const createLimiter = (maxRequests, windowMs = 60000, message) =>
  rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: "RATE_LIMITED",
        message: message || `Too many requests. Limit: ${maxRequests} per minute.`,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: maxRequests,
        role: req.user?.role || "unknown",
      });
    },
  });

// ─── Login endpoint limiter (prevent brute force) ──────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: "TOO_MANY_LOGIN_ATTEMPTS",
    message: "Too many login attempts. Account temporarily locked for 15 minutes.",
  },
});

// ─── Role-specific API limiters ─────────────────────────────────────────────
const adminLimiter    = createLimiter(1000, 60000, "Admin API limit: 1000 req/min");
const engineerLimiter = createLimiter(500,  60000, "Engineer API limit: 500 req/min");
const emergencyLimiter= createLimiter(2000, 60000, "Emergency API limit: 2000 req/min");
const analystLimiter  = createLimiter(100,  60000, "Analyst API limit: 100 req/min");

// ─── Dynamic limiter based on JWT role ─────────────────────────────────────
const dynamicLimiter = (req, res, next) => {
  const role = req.user?.role;
  const limiters = {
    admin: adminLimiter,
    engineer: engineerLimiter,
    emergency: emergencyLimiter,
    analyst: analystLimiter,
  };
  const limiter = limiters[role] || createLimiter(50);
  return limiter(req, res, next);
};

module.exports = { loginLimiter, dynamicLimiter, adminLimiter, analystLimiter };
