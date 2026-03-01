// server.js — URBA·NET Smart City Security Platform
require("dotenv").config();
const express  = require("express");
const http     = require("http");
const { Server } = require("socket.io");
const cors     = require("cors");
const path     = require("path");

const authRoutes   = require("./routes/auth");
const infraRoutes  = require("./routes/infrastructure");
const emergRoutes  = require("./routes/emergency");
const adminRoutes  = require("./routes/admin");
const { AUDIT_LOGS, ACTIVE_SESSIONS } = require("./config/db");
const { verifyToken, requestLogger } = require("./middleware/auth");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── Pass Socket.io to emergency router ────────────────────────────────────
require("./routes/emergency").setIO(io);

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/infra",     infraRoutes);
app.use("/api/emergency", emergRoutes);
app.use("/api/admin",     adminRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "URBA·NET API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime().toFixed(2) + "s",
    activeSessions: ACTIVE_SESSIONS.size,
    auditLogs: AUDIT_LOGS.length,
  });
});

// ─── Catch-all: serve frontend for non-API routes ───────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: "NOT_FOUND", message: `Route ${req.path} not found` });
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Internal server error" });
});

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on("join:role", (role) => {
    socket.join(role);
    console.log(`[WS] ${socket.id} joined room: ${role}`);
  });

  // Broadcast live sensor data every 5 seconds
  const dataInterval = setInterval(() => {
    socket.emit("sensor:update", {
      timestamp: new Date().toISOString(),
      power: {
        load: (800 + Math.random() * 400).toFixed(1),
        frequency: (49.8 + Math.random() * 0.4).toFixed(2),
      },
      water: {
        flow: (450 + Math.random() * 100).toFixed(1),
        pressure: (3.2 + Math.random() * 0.8).toFixed(2),
      },
      traffic: {
        congestion: (30 + Math.random() * 40).toFixed(1),
      },
    });
  }, 5000);

  socket.on("disconnect", () => {
    clearInterval(dataInterval);
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─── Start server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   URBA·NET Smart City Backend API        ║`);
  console.log(`║   Running on http://localhost:${PORT}       ║`);
  console.log(`║   WebSocket: ws://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  console.log(`  API Health  → http://localhost:${PORT}/api/health`);
  console.log(`  Frontend    → http://localhost:${PORT}\n`);
  console.log(`  Demo users (password for all: Password@123)`);
  console.log(`  ├── CTY-2024-0001 (admin)`);
  console.log(`  ├── ENG-2024-0342 (engineer)`);
  console.log(`  ├── EMS-2024-0911 (emergency)`);
  console.log(`  └── ANA-2024-0587 (analyst)\n`);
});
