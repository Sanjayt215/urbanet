// js/config.js — App configuration and role definitions
const API_BASE = 'http://localhost:5000/api';

const ROLE_CONFIG = {
  admin: {
    name: 'Arjun Mehta', badge: 'CTY-2024-0001', color: '#ff7730',
    avatarBg: 'rgba(255,119,48,.2)', badgeBg: 'rgba(255,119,48,.12)', badgeColor: '#ff7730',
    title: 'Super Administrator', clearance: 'L5 — FULL ACCESS',
    navItems: [
      {icon:'[H]',label:'Overview',locked:false},
      {icon:'[P]',label:'Power Grid',locked:false},
      {icon:'[W]',label:'Water Network',locked:false},
      {icon:'[T]',label:'Traffic Control',locked:false},
      {icon:'[!]',label:'Emergency Cmd',locked:false},
      {icon:'[U]',label:'User Manager',locked:false},
      {icon:'[L]',label:'Full Audit Log',locked:false},
    ],
    modules: [
      {icon:'⚡',name:'Power Grid',desc:'Full city power monitoring & control',locked:false,status:'ONLINE'},
      {icon:'💧',name:'Water Network',desc:'Pressure, flow & quality management',locked:false,status:'ONLINE'},
      {icon:'🚦',name:'Traffic Control',desc:'Signal management & route optimization',locked:false,status:'ONLINE'},
      {icon:'🚨',name:'Emergency Cmd',desc:'Dispatch & command coordination',locked:false,status:'STANDBY'},
      {icon:'📡',name:'IoT Sensor Hub',desc:'All 247 sensor feeds & device mgmt',locked:false,status:'ONLINE'},
      {icon:'🔑',name:'Access Manager',desc:'Users, roles, API keys & audit',locked:false,status:'ONLINE'},
    ],
    perms:['READ:ALL','WRITE:ALL','DELETE:LOGS','MANAGE:USERS','API:UNLIMITED','EMERGENCY:DECLARE'],
    denyPerms:[],
    stats:[
      {icon:'🟢',val:'247',label:'Active Sensors',change:'+3 today',up:true},
      {icon:'👥',val:'18',label:'Users Online',change:'+2 this hr',up:true},
      {icon:'⚠️',val:'2',label:'Alerts',change:'-1 resolved',up:false},
      {icon:'🔒',val:'99.9%',label:'Uptime',change:'Last 30 days',up:true},
    ],
    canEmergency: true, assignedZone: null,
    apiDemos: [
      {method:'GET',endpoint:'/api/infra/power',desc:'Read full power grid data',role:'admin',expectCode:200},
      {method:'POST',endpoint:'/api/infra/power/control',desc:'Control substation',role:'admin',expectCode:200},
      {method:'GET',endpoint:'/api/admin/users',desc:'List all users',role:'admin',expectCode:200},
      {method:'POST',endpoint:'/api/emergency/declare',desc:'Declare emergency',role:'admin',expectCode:200},
      {method:'GET',endpoint:'/api/admin/audit-logs',desc:'Full audit logs',role:'admin',expectCode:200},
      {method:'GET',endpoint:'/api/infra/system/config',desc:'System config (L5)',role:'admin',expectCode:200},
    ]
  },
  engineer: {
    name: 'Priya Subramaniam', badge: 'ENG-2024-0342', color: '#00d4ff',
    avatarBg: 'rgba(0,212,255,.15)', badgeBg: 'rgba(0,212,255,.08)', badgeColor: '#00d4ff',
    title: 'Infrastructure Engineer', clearance: 'L3 — ZONE 3 ONLY',
    // ── Only nav items the engineer actually uses; no admin/emergency/audit entries at all ──
    navItems: [
      {icon:'[H]',label:'My Zone Overview',locked:false},
      {icon:'[P]',label:'Power Grid Z3',locked:false},
      {icon:'[W]',label:'Water Network Z3',locked:false},
      {icon:'[T]',label:'Traffic (Read)',locked:false},
      {icon:'[S]',label:'IoT Sensors Z3',locked:false},
    ],
    // ── Only modules relevant to Zone 3 engineering work ──
    modules: [
      {icon:'⚡',name:'Power Grid Z3',desc:'Zone 3 power monitoring & substation control',locked:false,status:'ONLINE'},
      {icon:'💧',name:'Water Network Z3',desc:'Zone 3 pipeline, pump & pressure management',locked:false,status:'ONLINE'},
      {icon:'🚦',name:'Traffic (Read)',desc:'City-wide signal status — view only, no writes',locked:false,status:'ONLINE'},
      {icon:'📡',name:'IoT Hub Z3',desc:'Zone 3 sensors only — 38 active devices',locked:false,status:'ONLINE'},
      {icon:'📋',name:'Zone 3 Diagnostics',desc:'Fault logs & maintenance records for Zone 3',locked:false,status:'ONLINE'},
    ],
    perms:['READ:POWER:Z3','WRITE:POWER:Z3','READ:WATER:Z3','WRITE:WATER:Z3','READ:TRAFFIC','READ:IOT:Z3','READ:DIAG:Z3','API:500/MIN'],
    denyPerms:['WRITE:TRAFFIC','DELETE:LOGS','MANAGE:USERS','EMERGENCY:DECLARE','SYSTEM:CONFIG','READ:ALL_ZONES'],
    stats:[
      {icon:'📍',val:'Z3',label:'Assigned Zone',change:'South Grid',up:true},
      {icon:'📡',val:'38',label:'Zone Sensors',change:'All nominal',up:true},
      {icon:'⚠️',val:'1',label:'Zone Alerts',change:'Pipe P-17 pressure',up:false},
      {icon:'⏱️',val:'500/m',label:'API Rate Limit',change:'Field shift',up:true},
    ],
    canEmergency: false, assignedZone: 3,
    apiDemos: [
      {method:'GET',endpoint:'/api/infra/power',desc:'Zone 3 power data (scoped)',role:'engineer',expectCode:200},
      {method:'POST',endpoint:'/api/infra/water/control',desc:'Control Zone 3 pumps',role:'engineer',expectCode:200},
      {method:'GET',endpoint:'/api/infra/sensors',desc:'Zone 3 IoT sensors only',role:'engineer',expectCode:200},
      {method:'GET',endpoint:'/api/infra/traffic',desc:'Traffic read-only view',role:'engineer',expectCode:200},
      {method:'GET',endpoint:'/api/admin/users',desc:'Admin endpoint — blocked',role:'engineer',expectCode:403},
      {method:'POST',endpoint:'/api/emergency/declare',desc:'Emergency declare — blocked',role:'engineer',expectCode:403},
    ]
  },
  emergency: {
    name: 'Karthik Rajan', badge: 'EMS-2024-0911', color: '#ff2255',
    avatarBg: 'rgba(255,34,85,.15)', badgeBg: 'rgba(255,34,85,.1)', badgeColor: '#ff2255',
    title: 'Emergency Responder', clearance: 'L4 — INCIDENT ELEVATED',
    navItems: [
      {icon:'[H]',label:'Incident Board',locked:false},
      {icon:'[P]',label:'Power Override',locked:false},
      {icon:'[W]',label:'Emergency Water',locked:false},
      {icon:'[T]',label:'Traffic Corridor',locked:false},
      {icon:'[!]',label:'Dispatch Cmd',locked:false},
      {icon:'[U]',label:'User Manager',locked:true},
      {icon:'[L]',label:'Incident Logs',locked:false},
    ],
    modules: [
      {icon:'⚡',name:'Power Override',desc:'Emergency blackout/restore all zones',locked:false,status:'ACTIVE'},
      {icon:'💧',name:'Emergency Water',desc:'Emergency supply routing',locked:false,status:'ONLINE'},
      {icon:'🚦',name:'Emergency Corridor',desc:'Signal override for emergency routes',locked:false,status:'ONLINE'},
      {icon:'🚨',name:'Dispatch Command',desc:'Full dispatch center',locked:false,status:'ACTIVE'},
      {icon:'📡',name:'All Zone Sensors',desc:'Full city sensor access',locked:false,status:'ELEVATED'},
      {icon:'🔑',name:'Access Manager',desc:'Restricted — Admin only',locked:true,status:'LOCKED'},
    ],
    perms:['READ:ALL','WRITE:POWER:EMERGENCY','WRITE:TRAFFIC:EMERGENCY','DISPATCH:ALL','OVERRIDE:SIGNALS','API:2000/MIN'],
    denyPerms:['DELETE:LOGS','MANAGE:USERS','SYSTEM:CONFIG'],
    stats:[
      {icon:'🚨',val:'3',label:'Active Incidents',change:'+1 new',up:false},
      {icon:'🚒',val:'12',label:'Units Deployed',change:'8 zones covered',up:true},
      {icon:'⏱️',val:'4m',label:'Avg Response',change:'Improved',up:true},
      {icon:'📡',val:'247',label:'Sensors Active',change:'All zones',up:true},
    ],
    canEmergency: true, assignedZone: null,
    apiDemos: [
      {method:'GET',endpoint:'/api/infra/power',desc:'Full city power data',role:'emergency',expectCode:200},
      {method:'POST',endpoint:'/api/emergency/declare',desc:'Declare emergency',role:'emergency',expectCode:200},
      {method:'POST',endpoint:'/api/infra/traffic/signal',desc:'Override traffic signals',role:'emergency',expectCode:200},
      {method:'GET',endpoint:'/api/emergency/incidents',desc:'View all incidents',role:'emergency',expectCode:200},
      {method:'GET',endpoint:'/api/admin/users',desc:'Try user management',role:'emergency',expectCode:403},
      {method:'GET',endpoint:'/api/infra/sensors',desc:'All city sensors',role:'emergency',expectCode:200},
    ]
  },
  analyst: {
    name: 'Sneha Krishnaswamy', badge: 'ANA-2024-0587', color: '#00ff88',
    avatarBg: 'rgba(0,255,136,.1)', badgeBg: 'rgba(0,255,136,.06)', badgeColor: '#00ff88',
    title: 'Data Analyst', clearance: 'L2 — READ ONLY',
    navItems: [
      {icon:'[H]',label:'Analytics Home',locked:false},
      {icon:'[P]',label:'Power Analytics',locked:false},
      {icon:'[W]',label:'Water Trends',locked:false},
      {icon:'[T]',label:'Traffic Patterns',locked:false},
      {icon:'[!]',label:'Emergency Cmd',locked:true},
      {icon:'[U]',label:'User Manager',locked:true},
      {icon:'[L]',label:'Full Audit Log',locked:true},
    ],
    modules: [
      {icon:'⚡',name:'Power Analytics',desc:'Consumption trends (aggregated)',locked:false,status:'ONLINE'},
      {icon:'💧',name:'Water Trends',desc:'Usage patterns & efficiency',locked:false,status:'ONLINE'},
      {icon:'🚦',name:'Traffic Patterns',desc:'Flow analysis & heatmaps',locked:false,status:'ONLINE'},
      {icon:'🚨',name:'Emergency Cmd',desc:'Restricted — Responders only',locked:true,status:'LOCKED'},
      {icon:'📡',name:'Public Sensors',desc:'Aggregated IoT metrics only',locked:false,status:'ONLINE'},
      {icon:'🔑',name:'Access Manager',desc:'Restricted — Admin only',locked:true,status:'LOCKED'},
    ],
    perms:['READ:POWER:AGG','READ:WATER:AGG','READ:TRAFFIC:AGG','READ:IOT:PUBLIC','EXPORT:CSV','API:100/MIN'],
    denyPerms:['WRITE:ANY','DELETE:LOGS','MANAGE:USERS','EMERGENCY:DECLARE'],
    stats:[
      {icon:'📊',val:'14',label:'Reports Today',change:'+3 exports',up:true},
      {icon:'📈',val:'+12%',label:'Power Efficiency',change:'vs last month',up:true},
      {icon:'🚦',val:'-8%',label:'Congestion',change:'vs baseline',up:true},
      {icon:'💾',val:'4.2GB',label:'Data Exported',change:'This session',up:true},
    ],
    canEmergency: false, assignedZone: null,
    apiDemos: [
      {method:'GET',endpoint:'/api/infra/power',desc:'Aggregated power data only',role:'analyst',expectCode:200},
      {method:'GET',endpoint:'/api/infra/water',desc:'Aggregated water data',role:'analyst',expectCode:200},
      {method:'POST',endpoint:'/api/infra/power/control',desc:'Try write power grid',role:'analyst',expectCode:403},
      {method:'POST',endpoint:'/api/emergency/declare',desc:'Try declare emergency',role:'analyst',expectCode:403},
      {method:'GET',endpoint:'/api/admin/users',desc:'Try admin endpoint',role:'analyst',expectCode:403},
      {method:'GET',endpoint:'/api/infra/traffic',desc:'Traffic analytics',role:'analyst',expectCode:200},
    ]
  }
};
