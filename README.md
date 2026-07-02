# Virtual Bingo

A real-time multiplayer bingo game that runs in any browser. No app download,
no account, no setup for players. The host opens a lobby, shares a QR code,
and everyone joins by scanning it and typing their name.

🎮 **[Play now → virtual-bingo-pfgs.onrender.com](https://virtual-bingo-pfgs.onrender.com)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tummala-hareesh/virtual-bingo)

---

## How it works (the 30-second version)

1. **Host** opens `/admin` and clicks **"Open Lobby"** — gets a QR code and 6-character join code.
2. **Players** scan the QR code on their phones, type their name, and see their unique bingo ticket.
3. **Host** clicks **"Start Game"** — everyone's phone is ready.
4. Host draws numbers; each player taps their own ticket squares to mark them.
5. First to complete a line, two lines, or the full house claims the prize.
6. `/spectate` can be opened on a TV for a live scoreboard showing everyone's progress.

---

## Game rules

- **75-ball bingo**, 5×5 ticket
- Columns: B = 1–15, I = 16–30, N = 31–45, G = 46–60, O = 61–75
- Center cell is a FREE space (auto-marked)
- A **line** is any complete row, column, or diagonal
- Three prize tiers claimed in order: **1 Line → 2 Lines → Full House**
- Players tap their own squares — the server validates every mark against drawn numbers
- Claims are server-validated too — no cheating possible

---

## Option 1: Play from anywhere (recommended)

Deploy to [Render](https://render.com) for free. Players join from any network,
any device — no shared Wi-Fi required.

### Deploy in 3 steps

**Step 1 — Deploy to Render**

Click the button at the top, connect your GitHub account, and Render auto-reads
`render.yaml` to configure everything. You'll get a permanent URL like:

```
https://virtual-bingo-xxxx.onrender.com
```

**Step 2 — Add the deploy secret** (for auto-redeploy on every git push)

1. On Render: open your service → **Settings** → **Deploy Hook** → copy the URL
2. On GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: the URL you just copied

**Step 3 — Play**

Open `https://your-app.onrender.com/admin` and run the game. Share the QR code
with players — they join from anywhere.

> **Free tier note:** Render's free tier sleeps after ~15 minutes of no traffic.
> The first visitor after a gap waits 20–50 seconds for it to wake. Keep at
> least one browser tab open during an active game to prevent sleep.
> If the server restarts mid-game, in-memory game state resets — start a new game.

For the full step-by-step walkthrough see [DEPLOY.md](DEPLOY.md).

---

## Option 2: Play on a local network

Run the server on your laptop. Players join over the same Wi-Fi — no internet
required at all. Good for homes, offices, venues, camping.

### One-time setup

Install **Node.js** from **https://nodejs.org** (LTS version, free, one-time).
No npm packages, no build step — that's the only dependency.

### Starting the game

**Mac:** Double-click `start-mac.command`
_(First run: right-click → "Open" → confirm if macOS shows a security warning)_

**Windows:** Double-click `start-windows.bat`

**Terminal (any OS):**
```bash
node server.js
```

The terminal prints your local address:
```
🎉  Virtual Bingo is running!

  Admin (host this device):   http://192.168.1.42:4590/admin
  Players (same Wi-Fi):       http://192.168.1.42:4590/join
```

Keep this terminal window open while playing.

### Playing

1. Open the **Admin** URL on your laptop → click **"Open Lobby"**
2. A QR code and 6-character join code appear
3. Players scan the QR (or visit `/join` and type the code), then enter their name
4. Watch names appear on the admin lobby screen in real time
5. Click **"Start Game"** when everyone is in
6. Press **"Draw Number"** to call each ball — all phones update instantly
7. Players tap their squares to mark them; claims are validated by the server
8. **"Start a new game"** resets everything for another round

### Troubleshooting

**Players can't connect:**
- Every device must be on the exact same Wi-Fi network (not a guest SSID — many guest networks block device-to-device traffic; use the main home Wi-Fi)
- If your OS asks whether to allow Node.js through the firewall, click Allow

**QR code shows the wrong address:**
- Your laptop has multiple network adapters (Wi-Fi + Ethernet + VPN). Disable Ethernet/VPN and restart the server

**Admin refreshed and QR disappeared:**
- The join code is stored in `localStorage` on the admin's browser — refreshing the same browser restores it automatically. On a different device, click "Start a new game" to generate a fresh code.

**Player refreshed and lost their ticket:**
- Tickets are cached in `localStorage`. A refresh on the same browser restores from cache instantly; the server is the source of truth.

---

## Pages

| URL | Who uses it | What it does |
|-----|-------------|--------------|
| `/` | Anyone | Home page — links to admin and join |
| `/admin` | Host only | Opens lobby, shares QR code, draws numbers, sees live progress |
| `/join` | Players | Enter game code + name → get ticket |
| `/player` | Players | Live bingo ticket — tap squares to mark, claim prizes |
| `/spectate` | TV / observers | Big-screen scoreboard — live progress bars for all players |

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | SSE stream — live game state pushed to all clients |
| GET | `/api/game/state` | Current public game state (no marks, no full tickets) |
| POST | `/api/game/open` | Create a new lobby (`status: "lobby"`, empty player list) |
| POST | `/api/game/start` | Start the game — transitions lobby to active, enables draw |
| POST | `/api/game/reset` | Clear the current game |
| POST | `/api/join` | Body: `{code, name}` — player self-registers, returns ticket |
| GET | `/api/game/players?code=XXX` | Player list — requires join code |
| GET | `/api/ticket?id=XXX` | Full ticket + marks for one player |
| POST | `/api/draw` | Draw the next random number |
| POST | `/api/mark` | Body: `{playerId, row, col}` — toggle a cell mark |
| POST | `/api/claim` | Body: `{playerId, tier}` — claim a prize (`line1`, `line2`, `fullHouse`) |
| GET | `/api/lan-info` | Returns `{ip, port}` for QR code generation |

### Join error codes

| Condition | HTTP status | Message |
|-----------|-------------|---------|
| Wrong join code | 403 | "That code doesn't match — check with your host." |
| Name already taken | 409 | "That name is taken — try a different one." |
| Game already started | 400 | "The game has already started. Ask your host to start a new game." |
| Game full (50 players) | 400 | "Game is full (50 players max)." |
| No game exists | 404 | "No game found. Ask your host to create one." |

---

## Architecture

- **`server.js`** — single-file Node.js HTTP server, ~270 lines, zero npm dependencies
- **In-memory state** — no database; game resets on server restart (by design)
- **Server-Sent Events** — one-way push channel from server to all connected browsers; native in every modern browser, no library needed
- **30-second SSE heartbeat** — keeps connections alive through reverse proxies (e.g. Render's infrastructure)
- **Static files** — served from `public/` with path traversal protection
- **Join code** — 6 characters from an unambiguous charset (no 0/O, no 1/I); sufficient entropy for family/office use

### Game state shape

```js
game = {
  id,          // hex string — changes on each new game
  joinCode,    // 6-char string — e.g. "K3F9QX"
  status,      // "lobby" | "active"
  players: [
    {
      id,      // hex string — stored in player's localStorage
      name,
      ticket,  // 5×5 grid, grid[row][col], center is "FREE"
      marks,   // Set<"row-col"> — e.g. "2-2" for FREE center
    }
  ],
  drawn,       // number[] in draw order
  drawnSet,    // Set<number> for O(1) lookup
  winners: { line1, line2, fullHouse },  // each: null | { playerId, name, time }
  createdAt,
}
```

### `publicState()` — what SSE broadcasts

```js
{
  active,        // true when status === "active"
  status,        // "lobby" | "active"
  id,
  drawn,
  lastNumber,
  remainingCount,
  winners: { line1, line2, fullHouse },
  players: [
    { id, name, lines, fullHouse, markedCount }  // no marks, no ticket
  ]
}
```

Player marks and full ticket data are never exposed via SSE — only via
`/api/ticket?id=XXX` which requires the player's own ID.

---

## localStorage keys

| Key | Set by | Contents |
|-----|--------|----------|
| `bingoPlayerId` | join.html | Player's server-assigned ID |
| `bingoPlayerName` | join.html | Player's chosen name |
| `bingoTicketCache` | player.html | `{gameId, playerId, ticket, marks, drawn, winners}` |
| `bingoAdminGameId` | admin.html | Game ID when lobby was opened |
| `bingoAdminCode` | admin.html | Join code — survives page refresh |

---

## Development

```bash
node server.js          # start server on port 4590
PORT=8080 node server.js  # custom port
```

No build step. Edit any file in `public/` and refresh the browser.

Zero dependencies — the entire `node_modules/` story is: there is no `node_modules/`.

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for step-by-step Render + GitHub Actions instructions.

---

MIT License — free to use, fork, and self-host.
