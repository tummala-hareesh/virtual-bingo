// Virtual Bingo — local network + cloud-hosted server
// Zero dependencies. Uses only Node.js built-in modules.
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 4590;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- In-memory game state ----------
// status: 'lobby' (players joining) | 'active' (drawing in progress)
let game = null;

// ---------- SSE client registry ----------
const sseClients = new Set();

// Keep SSE connections alive through Render's proxy (kills idle connections after ~90s)
setInterval(() => {
  for (const res of sseClients) res.write(': ping\n\n');
}, 30000);

function broadcast() {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

// ---------- Ticket generation (75-ball, 5x5, FREE center) ----------
function pickUnique(min, max, count) {
  const pool = [];
  for (let n = min; n <= max; n++) pool.push(n);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

function generateTicket() {
  const B = pickUnique(1, 15, 5);
  const I = pickUnique(16, 30, 5);
  const N = pickUnique(31, 45, 4);
  const G = pickUnique(46, 60, 5);
  const O = pickUnique(61, 75, 5);
  N.splice(2, 0, 'FREE'); // center of N column is row index 2

  const cols = [B, I, N, G, O];
  // grid[row][col]
  const grid = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) row.push(cols[c][r]);
    grid.push(row);
  }
  return grid;
}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

// Short, human-typeable join code (avoids ambiguous chars like 0/O, 1/I)
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---------- Game logic ----------
function openLobby() {
  game = {
    id: newId(),
    joinCode: generateJoinCode(),
    players: [],
    drawn: [],
    drawnSet: new Set(),
    winners: { line1: null, line2: null, fullHouse: null },
    status: 'lobby',
    createdAt: Date.now(),
  };
  return game;
}

function drawNumber() {
  if (!game) return null;
  const remaining = [];
  for (let n = 1; n <= 75; n++) if (!game.drawnSet.has(n)) remaining.push(n);
  if (remaining.length === 0) return null;
  const next = remaining[Math.floor(Math.random() * remaining.length)];
  game.drawn.push(next);
  game.drawnSet.add(next);
  return next;
}

function countCompleteLines(player) {
  const grid = player.ticket;
  const marks = player.marks;
  let lines = 0;

  // rows
  for (let r = 0; r < 5; r++) {
    let complete = true;
    for (let c = 0; c < 5; c++) if (!marks.has(`${r}-${c}`)) complete = false;
    if (complete) lines++;
  }
  // columns
  for (let c = 0; c < 5; c++) {
    let complete = true;
    for (let r = 0; r < 5; r++) if (!marks.has(`${r}-${c}`)) complete = false;
    if (complete) lines++;
  }
  // diagonals
  let d1 = true, d2 = true;
  for (let i = 0; i < 5; i++) {
    if (!marks.has(`${i}-${i}`)) d1 = false;
    if (!marks.has(`${i}-${4 - i}`)) d2 = false;
  }
  if (d1) lines++;
  if (d2) lines++;

  return lines;
}

function isFullHouse(player) {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (!player.marks.has(`${r}-${c}`)) return false;
    }
  }
  return true;
}

function publicState() {
  if (!game) return { active: false };
  return {
    active: game.status === 'active',
    status: game.status,
    id: game.id,
    drawn: game.drawn,
    lastNumber: game.drawn[game.drawn.length - 1] || null,
    remainingCount: 75 - game.drawn.length,
    winners: game.winners,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      lines: countCompleteLines(p),
      fullHouse: isFullHouse(p),
      markedCount: p.marks.size,
    })),
  };
}

function lanAddress() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ---------- Static file serving ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const ROUTES = {
  '/': '/index.html',
  '/admin': '/admin.html',
  '/join': '/join.html',
  '/player': '/player.html',
  '/spectate': '/spectate.html',
};

function serveStatic(req, res, pathname) {
  const cleanPath = pathname.split('?')[0];
  let filePath = ROUTES[cleanPath] || cleanPath;
  const fullPath = path.join(PUBLIC_DIR, filePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// ---------- Request handler ----------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS-lite (same LAN only anyway, but harmless)
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // ----- SSE stream -----
    if (pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(publicState())}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // ----- LAN info -----
    if (pathname === '/api/lan-info' && req.method === 'GET') {
      sendJson(res, 200, { ip: lanAddress(), port: PORT });
      return;
    }

    // ----- Open lobby (Sprint B) -----
    if (pathname === '/api/game/open' && req.method === 'POST') {
      openLobby();
      broadcast();
      sendJson(res, 200, { ok: true, joinCode: game.joinCode, gameId: game.id });
      return;
    }

    // ----- Player self-join (Sprint B) -----
    if (pathname === '/api/join' && req.method === 'POST') {
      const body = await readBody(req);
      const code = (body.code || '').toString().toUpperCase().trim();
      const name = (body.name || '').toString().trim();

      if (!game) {
        sendJson(res, 404, { error: 'No game found. Ask your host to create one.' });
        return;
      }
      if (code !== game.joinCode) {
        sendJson(res, 403, { error: "That code doesn't match — check with your host." });
        return;
      }
      if (!name) {
        sendJson(res, 400, { error: 'Please enter your name.' });
        return;
      }
      if (game.status !== 'lobby') {
        sendJson(res, 400, { error: 'The game has already started. Ask your host to start a new game.' });
        return;
      }
      if (game.players.length >= 50) {
        sendJson(res, 400, { error: 'Game is full (50 players max).' });
        return;
      }
      if (game.players.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
        sendJson(res, 409, { error: 'That name is taken — try a different one.' });
        return;
      }

      const player = {
        id: newId(),
        name,
        ticket: generateTicket(),
        marks: new Set(['2-2']),
      };
      game.players.push(player);
      broadcast();
      sendJson(res, 200, { ok: true, playerId: player.id, name: player.name, ticket: player.ticket });
      return;
    }

    // ----- Start game (Sprint B) -----
    if (pathname === '/api/game/start' && req.method === 'POST') {
      if (!game) {
        sendJson(res, 400, { error: 'No active game.' });
        return;
      }
      if (game.status !== 'lobby') {
        sendJson(res, 400, { error: 'Game has already started.' });
        return;
      }
      if (game.players.length < 1) {
        sendJson(res, 400, { error: 'Add at least one player before starting.' });
        return;
      }
      game.status = 'active';
      broadcast();
      sendJson(res, 200, { ok: true, state: publicState() });
      return;
    }

    // ----- Reset game -----
    if (pathname === '/api/game/reset' && req.method === 'POST') {
      game = null;
      broadcast();
      sendJson(res, 200, { ok: true });
      return;
    }

    // ----- Current state -----
    if (pathname === '/api/game/state' && req.method === 'GET') {
      sendJson(res, 200, publicState());
      return;
    }

    // ----- Player list (for legacy join page) — requires the join code -----
    if (pathname === '/api/game/players' && req.method === 'GET') {
      if (!game) {
        sendJson(res, 200, { active: false, players: [] });
        return;
      }
      const code = (parsed.query.code || '').toString().toUpperCase();
      if (code !== game.joinCode) {
        sendJson(res, 403, { active: true, requiresCode: true, error: 'Enter the code shown on the admin screen.' });
        return;
      }
      sendJson(res, 200, {
        active: true,
        status: game.status,
        players: game.players.map((p) => ({ id: p.id, name: p.name })),
      });
      return;
    }

    // ----- Get a player's ticket -----
    if (pathname === '/api/ticket' && req.method === 'GET') {
      const id = parsed.query.id;
      if (!game) {
        sendJson(res, 404, { error: 'No active game.' });
        return;
      }
      const player = game.players.find((p) => p.id === id);
      if (!player) {
        sendJson(res, 404, { error: 'Player not found.' });
        return;
      }
      sendJson(res, 200, {
        gameId: game.id,
        name: player.name,
        ticket: player.ticket,
        marks: Array.from(player.marks),
        drawn: game.drawn,
        winners: game.winners,
      });
      return;
    }

    // ----- Draw next number -----
    if (pathname === '/api/draw' && req.method === 'POST') {
      if (!game || game.status !== 'active') {
        sendJson(res, 400, { error: 'No active game.' });
        return;
      }
      const next = drawNumber();
      broadcast();
      sendJson(res, 200, { number: next, state: publicState() });
      return;
    }

    // ----- Toggle a mark -----
    if (pathname === '/api/mark' && req.method === 'POST') {
      const body = await readBody(req);
      const { playerId, row, col } = body;
      if (!game || game.status !== 'active') {
        sendJson(res, 400, { error: 'No active game.' });
        return;
      }
      const player = game.players.find((p) => p.id === playerId);
      if (!player) {
        sendJson(res, 404, { error: 'Player not found.' });
        return;
      }
      const value = player.ticket[row][col];
      const key = `${row}-${col}`;
      if (value === 'FREE') {
        sendJson(res, 200, { ok: true, marks: Array.from(player.marks) });
        return;
      }
      if (!game.drawnSet.has(value)) {
        sendJson(res, 400, { error: 'That number has not been called yet.' });
        return;
      }
      if (player.marks.has(key)) {
        player.marks.delete(key);
      } else {
        player.marks.add(key);
      }
      broadcast();
      sendJson(res, 200, { ok: true, marks: Array.from(player.marks) });
      return;
    }

    // ----- Claim a win tier -----
    if (pathname === '/api/claim' && req.method === 'POST') {
      const body = await readBody(req);
      const { playerId, tier } = body;
      if (!game || game.status !== 'active') {
        sendJson(res, 400, { error: 'No active game.' });
        return;
      }
      const player = game.players.find((p) => p.id === playerId);
      if (!player) {
        sendJson(res, 404, { error: 'Player not found.' });
        return;
      }
      if (!['line1', 'line2', 'fullHouse'].includes(tier)) {
        sendJson(res, 400, { error: 'Invalid tier.' });
        return;
      }
      if (game.winners[tier]) {
        sendJson(res, 400, { error: 'That prize has already been claimed.' });
        return;
      }
      const lines = countCompleteLines(player);
      let valid = false;
      if (tier === 'line1' && lines >= 1) valid = true;
      if (tier === 'line2' && lines >= 2 && game.winners.line1) valid = true;
      if (tier === 'fullHouse' && isFullHouse(player)) valid = true;

      if (!valid) {
        sendJson(res, 400, { error: 'Claim does not match the ticket yet — keep marking!' });
        return;
      }
      game.winners[tier] = { playerId: player.id, name: player.name, time: Date.now() };
      broadcast();
      sendJson(res, 200, { ok: true, tier, state: publicState() });
      return;
    }

    // ----- Fallback: static files -----
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, () => {
  const ip = lanAddress();
  console.log('');
  console.log('  🎉  Virtual Bingo is running!');
  console.log('');
  console.log(`  Admin (host this device):   http://${ip}:${PORT}/admin`);
  console.log(`  Players (same Wi-Fi):       http://${ip}:${PORT}/join`);
  console.log('');
  console.log('  Open the Admin link above in YOUR browser to create the game.');
  console.log('  Share the QR code shown there with everyone else.');
  console.log('');
});
