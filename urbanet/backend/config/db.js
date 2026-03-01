// config/db.js
// In-memory database simulation (replace with PostgreSQL in production)
// Passwords are bcrypt hashed: all demo passwords = "Password@123"

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Pre-hashed password: "Password@123"
const HASHED_PASSWORD =
  "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

const USERS = [
  {
    id: uuidv4(),
    badgeId: "CTY-2024-0001",
    name: "Arjun Mehta",
    role: "admin",
    zone: "ALL",
    clearance: "L5",
    password: HASHED_PASSWORD,
    isActive: true,
    department: "City IT Administration",
    email: "arjun.mehta@urbanet.city",
    lastLogin: null,
    failedAttempts: 0,
  },
  {
    id: uuidv4(),
    badgeId: "ENG-2024-0342",
    name: "Priya Subramaniam",
    role: "engineer",
    zone: "ZONE-3",
    clearance: "L3",
    password: HASHED_PASSWORD,
    isActive: true,
    department: "Infrastructure Engineering",
    email: "priya.sub@urbanet.city",
    lastLogin: null,
    failedAttempts: 0,
  },
  {
    id: uuidv4(),
    badgeId: "EMS-2024-0911",
    name: "Karthik Rajan",
    role: "emergency",
    zone: "ALL",
    clearance: "L4",
    password: HASHED_PASSWORD,
    isActive: true,
    department: "Emergency Response Unit",
    email: "karthik.rajan@urbanet.city",
    lastLogin: null,
    failedAttempts: 0,
  },
  {
    id: uuidv4(),
    badgeId: "ANA-2024-0587",
    name: "Sneha Krishnaswamy",
    role: "analyst",
    zone: "READ-ONLY",
    clearance: "L2",
    password: HASHED_PASSWORD,
    isActive: true,
    department: "Urban Data Analytics",
    email: "sneha.k@urbanet.city",
    lastLogin: null,
    failedAttempts: 0,
  },
];

// In-memory audit log store
const AUDIT_LOGS = [];

// In-memory active sessions (Redis simulation)
const ACTIVE_SESSIONS = new Map();

// In-memory OTP store
const OTP_STORE = new Map();

// Emergency state
let EMERGENCY_STATE = {
  active: false,
  declaredBy: null,
  declaredAt: null,
  activeZones: [],
};

module.exports = {
  USERS,
  AUDIT_LOGS,
  ACTIVE_SESSIONS,
  OTP_STORE,
  EMERGENCY_STATE,
};
