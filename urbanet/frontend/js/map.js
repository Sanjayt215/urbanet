// js/map.js — SVG City Map Renderer (zero external deps)
const ZONE_RECTS = [
  { id:1, name:'Zone 1 — North',   x:80,  y:25,  w:220, h:95,  baseColor:'#00d4ff' },
  { id:2, name:'Zone 2 — Central', x:220, y:112, w:220, h:100, baseColor:'#a855f7' },
  { id:3, name:'Zone 3 — South',   x:100, y:172, w:240, h:85,  baseColor:'#00ff88' },
];
const USER_DOTS = {
  admin:[330,130], engineer:[200,210], emergency:[290,155], analyst:[330,130]
};

function renderSVGMap(containerId, roleKey, tall = false, activeZones = new Set()) {
  const role = ROLE_CONFIG[roleKey];
  const W = 660, H = tall ? 280 : 200;

  // Grid
  let grid = '';
  for (let x = 0; x <= W; x += 44) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(0,212,255,.04)" stroke-width="1"/>`;
  for (let y = 0; y <= H; y += 44) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(0,212,255,.04)" stroke-width="1"/>`;

  // Buildings
  const bdata = [[30,H-70,18,70],[52,H-100,16,100],[75,H-60,14,60],[96,H-120,20,120],[122,H-80,15,80],[143,H-140,23,140],[174,H-90,17,90],[198,H-65,13,65],[218,H-165,26,165],[252,H-110,18,110],[278,H-185,28,185],[316,H-130,20,130],[344,H-100,16,100],[368,H-158,24,158],[402,H-85,15,85],[424,H-120,18,120],[450,H-75,14,75],[472,H-148,22,148],[506,H-92,17,92],[530,H-65,13,65],[550,H-132,20,132],[582,H-82,16,82],[606,H-102,18,102]];
  const bldgs = bdata.map(([bx,by,bw,bh]) => `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="rgba(0,212,255,.1)" stroke-width="1"/>`).join('');

  // Windows
  let wins = '';
  bdata.forEach(([bx,by,bw,bh]) => {
    for (let wx = bx+3; wx < bx+bw-5; wx+=7)
      for (let wy = by+5; wy < by+bh-5; wy+=9)
        if (Math.random()>.5) wins += `<rect x="${wx}" y="${wy}" width="4" height="4" fill="rgba(255,201,48,.2)" rx="1"/>`;
  });

  // Roads
  const roads = `
    <line x1="0" y1="${H*.56}" x2="${W}" y2="${H*.56}" stroke="rgba(255,255,255,.06)" stroke-width="8"/>
    <line x1="${W*.38}" y1="0" x2="${W*.38}" y2="${H}" stroke="rgba(255,255,255,.05)" stroke-width="6"/>
    <line x1="0" y1="${H*.8}" x2="${W}" y2="${H*.8}" stroke="rgba(255,255,255,.04)" stroke-width="4"/>
    <line x1="${W*.65}" y1="0" x2="${W*.65}" y2="${H}" stroke="rgba(255,255,255,.03)" stroke-width="4"/>`;

  // Zones
  let zones = ZONE_RECTS.map(z => {
    const isAssigned = role.assignedZone === null || role.assignedZone === z.id;
    const isEmerg = activeZones.has(z.id);
    const color = isEmerg ? '#ff2255' : z.baseColor;
    const fillOp = isAssigned ? '.09' : '.02';
    const sOp = isAssigned ? '1' : '.3';
    const dash = isAssigned ? '' : 'stroke-dasharray="8,5"';
    const pulse = isEmerg ? `<animate attributeName="opacity" values=".8;.3;.8" dur="1.5s" repeatCount="indefinite"/>` : '';
    const yAdj = H < 260 ? z.y - 25 : z.y;
    const hAdj = H < 260 ? z.h - 10 : z.h;
    return `
      <rect x="${z.x}" y="${yAdj}" width="${z.w}" height="${hAdj}"
        fill="${color}" fill-opacity="${fillOp}"
        stroke="${color}" stroke-width="${isAssigned?2:1}" stroke-opacity="${sOp}" ${dash} rx="6">
        ${pulse}
      </rect>
      <text x="${z.x+z.w/2}" y="${yAdj+hAdj/2-5}" text-anchor="middle"
        font-family="JetBrains Mono,monospace" font-size="10" font-weight="700"
        fill="${color}" opacity="${isAssigned?'1':'.4'}">${z.name}</text>
      <text x="${z.x+z.w/2}" y="${yAdj+hAdj/2+9}" text-anchor="middle"
        font-family="JetBrains Mono,monospace" font-size="8"
        fill="${color}" opacity="${isAssigned?.8:.3}">
        ${isEmerg?'!! EMERGENCY':isAssigned?'>> AUTHORIZED':'-- RESTRICTED'}
      </text>`;
  }).join('');

  // User dot
  const [ux, uyFull] = USER_DOTS[roleKey] || [330,130];
  const uy = H < 260 ? Math.min(uyFull - 20, H - 20) : uyFull;
  const uc = role.color;
  const userDot = `
    <circle cx="${ux}" cy="${uy}" r="16" fill="${uc}" fill-opacity=".08" stroke="${uc}" stroke-width="1" stroke-opacity=".3">
      <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".3;.1;.3" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${ux}" cy="${uy}" r="6" fill="${uc}" stroke="#fff" stroke-width="2"/>
    <rect x="${ux-30}" y="${uy-26}" width="60" height="16" fill="rgba(4,8,15,.85)" rx="3" stroke="${uc}" stroke-width="1" stroke-opacity=".5"/>
    <text x="${ux}" y="${uy-15}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="8" font-weight="700" fill="${uc}">${role.name.split(' ')[0]}</text>`;

  // UI overlays
  const compass = `
    <g transform="translate(${W-32},${H-32})">
      <circle cx="0" cy="0" r="12" fill="rgba(4,8,15,.8)" stroke="rgba(0,212,255,.3)" stroke-width="1"/>
      <text x="0" y="-3" text-anchor="middle" font-size="7" fill="#00d4ff" font-family="JetBrains Mono,monospace" font-weight="700">N</text>
      <text x="0" y="8" text-anchor="middle" font-size="6" fill="rgba(0,212,255,.5)" font-family="JetBrains Mono,monospace">S</text>
      <text x="-8" y="3" text-anchor="middle" font-size="6" fill="rgba(0,212,255,.5)" font-family="JetBrains Mono,monospace">W</text>
      <text x="8" y="3" text-anchor="middle" font-size="6" fill="rgba(0,212,255,.5)" font-family="JetBrains Mono,monospace">E</text>
    </g>`;

  const legend = `
    <rect x="8" y="8" width="125" height="48" fill="rgba(4,8,15,.8)" rx="4" stroke="rgba(0,212,255,.15)" stroke-width="1"/>
    <text x="14" y="20" font-size="8" font-family="JetBrains Mono,monospace" fill="rgba(0,212,255,.5)" font-weight="700">CITY ZONES</text>
    <circle cx="14" cy="29" r="3" fill="#00d4ff" opacity=".7"/><text x="21" y="32" font-size="8" font-family="JetBrains Mono,monospace" fill="#8baabf">Zone 1</text>
    <circle cx="14" cy="38" r="3" fill="#a855f7" opacity=".7"/><text x="21" y="41" font-size="8" font-family="JetBrains Mono,monospace" fill="#8baabf">Zone 2</text>
    <circle cx="14" cy="47" r="3" fill="#00ff88" opacity=".7"/><text x="21" y="50" font-size="8" font-family="JetBrains Mono,monospace" fill="#8baabf">Zone 3</text>`;

  const svg = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${W}" height="${H}" fill="#04080f"/>
    ${grid}${roads}${bldgs}${wins}${zones}${userDot}${compass}${legend}
  </svg>`;

  const el = document.getElementById(containerId);
  if (el) el.innerHTML = svg;
}
