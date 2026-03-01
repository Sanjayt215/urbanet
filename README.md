What is Urbanet?
Urbanet is a city infrastructure management portal built for the Urbanet Hackathon. It gives different types of city workers — admins, engineers, emergency responders, and data analysts — a single unified dashboard to monitor and control everything from power substations to traffic signals.
The core idea is simple: one login portal, but what you see depends entirely on who you are.
An infrastructure engineer assigned to Zone 3 should only see Zone 3. A data analyst should see aggregated trends, not raw sensor control panels. An emergency responder should be able to override traffic signals instantly, but shouldn't be able to manage user accounts. And the admin? Full access to everything.
This isn't just a UI trick — the restrictions are enforced on the backend too, so even a savvy user hitting the API directly can't access data or actions outside their role.

✨ Features

🔐 Multi-factor authentication — Badge ID + password + 6-digit OTP with JWT session management
👥 4 distinct role dashboards — each role sees a completely different interface, not just greyed-out buttons
⚡ Real-time sensor data — live WebSocket feed for power load, water flow, and traffic congestion
🗺️ Interactive city map — SVG geo-map with zone highlighting and emergency zone activation
🚨 Emergency declaration system — broadcast alerts to all connected users via WebSocket
📋 Full audit logging — every action is timestamped and logged with allow/deny status
🛡️ Zone-based access control — engineers are blocked from requesting data outside their assigned zone, even via API
⏱️ Session management — 4-hour sessions with live countdown, auto-logout, and JWT blacklisting
📊 API demo panel — built-in panel to test API calls and see real 200/403 responses
🌐 Demo mode — works fully offline without a backend (great for demos)


🚀 Getting Started
Prerequisites

Node.js 18+
npm

1. Clone the repo
bashgit clone https://github.com/your-username/urbanet.git
cd urbanet
2. Set up the backend
bashcd backend
npm install
Create a .env file:
envPORT=5000
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=4h
Start the server:
bashnode server.js
# → Server running on http://localhost:5000
3. Open the frontend
No build step needed — just open frontend/index.html in your browser.

No backend? No problem. The portal automatically switches to demo mode if the backend is offline, so you can still explore all 4 role dashboards.


🔑 Demo Accounts
RoleBadge IDPasswordOTP🟠 Super AdminCTY-2024-0001password123Click Generate🔵 Infrastructure EngineerENG-2024-0342password123Click Generate🔴 Emergency ResponderEMS-2024-0911password123Click Generate🟢 Data AnalystANA-2024-0587password123Click Generate

👤 Role Access Matrix
Each role has a completely different dashboard. Here's the breakdown:
Feature🟠 Admin🔵 Engineer🔴 Emergency🟢 AnalystPower Grid (all zones)✅❌✅📊 aggPower Grid (Zone 3 only)✅✅✅❌Water Network (Zone 3)✅✅✅📊 aggTraffic Control (write)✅❌✅ emergency❌Traffic (read-only)✅✅✅✅IoT Sensor Hub✅ all✅ Zone 3✅ all📊 publicEmergency Declaration✅❌✅❌User Management✅❌❌❌Full Audit Logs✅❌❌❌Data Export (CSV)✅❌❌✅

📊 = aggregated/anonymized data only


🗂️ Project Structure
urbanet/
├── backend/
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, role guard, zone guard, audit logger
│   │   └── rateLimiter.js     # Per-role API rate limits (admin: 1000/min, analyst: 100/min)
│   ├── routes/
│   │   ├── admin.js           # Admin-only: user management, sessions, audit logs
│   │   ├── auth.js            # Login, OTP generation, logout, /me
│   │   ├── emergency.js       # Declare/deactivate emergency, zone control
│   │   └── infrastructure.js  # Power, water, traffic, sensors — with zone scoping
│   ├── config/
│   │   └── db.js              # In-memory data store (users, sessions, audit logs)
│   └── server.js              # Express app + Socket.IO setup
│
└── frontend/
    ├── js/
    │   ├── config.js          # Role definitions (nav, modules, permissions, API demos)
    │   ├── dashboard.js       # Dashboard rendering + RBAC UI guards
    │   ├── auth.js            # Login flow, OTP, risk score, session timer
    │   ├── app.js             # WebSocket, clock, API health check
    │   ├── map.js             # SVG city map with zone rendering
    │   └── api.js             # All API call wrappers
    ├── css/
    │   ├── main.css
    │   ├── dashboard.css
    │   └── login.css
    └── index.html             # Single-page app entry point

🛡️ How the RBAC Works
There are two layers of access control, which is intentional — the frontend layer is for user experience, and the backend layer is for actual security.
Frontend (UX layer)
Role configurations live in config.js. Each role has its own set of navItems, modules, perms, and apiDemos. When you log in, buildDashboard() reads your role config and renders only what you're allowed to see:

Non-admin roles only see nav items and module cards that belong to them — locked items aren't shown at all
Admin sees everything, including a 🔒 indicator on features other roles can't access
The permissions panel reads from role.denyPerms to show exactly what each role is denied

Backend (enforcement layer)
Even if someone bypasses the frontend, the backend middleware stack stops them:
Request → verifyToken → dynamicLimiter → requireZoneAccess → requireRole → handler
MiddlewareWhat it doesverifyTokenValidates JWT, checks session is still active (not blacklisted)requireRole('admin', 'emergency')Blocks roles not in the allowed listrequireZoneAccessEngineers get a 403 if they request data from a zone other than their owndynamicLimiterRate limits based on role — analysts get 100 req/min, emergency gets 2000

🔌 API Overview
All endpoints require a valid JWT in the Authorization: Bearer <token> header.
POST   /api/auth/generate-otp       → Generate OTP for a badge ID
POST   /api/auth/login              → Authenticate, get JWT
POST   /api/auth/logout             → Blacklist token, end session
GET    /api/auth/me                 → Current user info

GET    /api/infra/power             → Power grid data (scoped by role/zone)
POST   /api/infra/power/control     → Control substation (admin/emergency only)
GET    /api/infra/water             → Water network data
POST   /api/infra/water/control     → Control pumps (admin/engineer Z3/emergency)
GET    /api/infra/traffic           → Traffic data
POST   /api/infra/traffic/signal    → Override signals (admin/emergency only)
GET    /api/infra/sensors           → IoT sensor feeds (scoped by role/zone)

POST   /api/emergency/declare       → Declare emergency (admin/emergency only)
POST   /api/emergency/deactivate    → Deactivate (admin/emergency only)
POST   /api/emergency/zone          → Activate/deactivate a zone

GET    /api/admin/users             → List all users (admin only)
GET    /api/admin/audit-logs        → Full audit log (admin only)
GET    /api/admin/sessions          → Active sessions (admin only)
DELETE /api/admin/sessions/:jti     → Force logout a session (admin only)

⚡ WebSocket Events
The server broadcasts real-time events via Socket.IO:
EventDirectionDescriptionjoin:roleClient → ServerSubscribe to role-specific updatessensor:updateServer → ClientLive power/water/traffic readingsemergency:declaredServer → AllEmergency broadcastemergency:deactivatedServer → AllEmergency clearedemergency:zone_updateServer → AllZone activated/deactivated

⚠️ Production Checklist
This was built for a hackathon, so some things need fixing before real deployment:

 Remove OTP from API response — in prod, send via SMS or email, never return it in the response body
 Replace in-memory store — config/db.js resets on restart; use a real database (PostgreSQL, MongoDB, Redis for sessions)
 Add HTTPS — API calls are currently over plain HTTP
 Change demo passwords — password123 is not a production password
 Rotate JWT secret — use a strong random secret, store it securely, never commit it
 Add refresh tokens — current 4-hour JWT expiry is hard-logout; refresh tokens would improve UX
 Audit log persistence — logs are in-memory and lost on restart


🧰 Tech Stack
LayerTechBackendNode.js, ExpressAuthJWT (jsonwebtoken), bcrypt, OTPReal-timeSocket.IORate limitingexpress-rate-limitFrontendVanilla JS, HTML, CSS — no framework, no build stepDataIn-memory (hackathon scope)

🤝 Contributing
Pull requests are welcome! If you're adding a new role or feature:

Add the role config in frontend/js/config.js
Add backend middleware guards in the relevant route files
Test both the UI layer (does the dashboard look right?) and the API layer (do the guards work?)
