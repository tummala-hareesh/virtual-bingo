# Virtual Bingo

A real-time multiplayer bingo game — no app download, no account, no setup for
players. The host shares a QR code; everyone scans it and plays instantly.

- **75-ball bingo** (5×5 ticket, FREE center space)
- **Prizes**: 1 Line → 2 Lines → Full House (rows, columns, diagonals)
- **Manual marking** — players tap their own numbers as they're called
- **One admin device** creates the game and draws numbers; everyone else joins
  from their phone

---

## Play from anywhere (recommended)

Deploy your own instance to [Render](https://render.com) for free — players can
join from any network, any device, no shared Wi-Fi required.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/hareesh-tummala/virtual-bingo)

Once deployed you get a permanent URL like `https://virtual-bingo-xxxx.onrender.com`.
Share that link (or the QR code the admin screen generates) and anyone anywhere
can join.

For step-by-step deploy instructions see [DEPLOY.md](DEPLOY.md).

---

## Play on a local network

If everyone is on the same Wi-Fi, you can run the server on your laptop instead
— no internet needed at all.

### One-time setup (5 minutes)

1. Install **Node.js** from **https://nodejs.org** (LTS version, free).
   No other installs, no npm packages.

### Every time you want to play

1. **Connect** the host laptop and all phones to the same Wi-Fi network.

2. **Start the server:**
   - **Mac:** double-click `start-mac.command`
     _(first run: right-click → "Open" → confirm if macOS warns you)_
   - **Windows:** double-click `start-windows.bat`
   - Keep the terminal window open — that's your game server.

3. The terminal prints your local URL:
   ```
   Admin (host this device):   http://192.168.1.42:4590/admin
   Players (same Wi-Fi):       http://192.168.1.42:4590/join
   ```

4. Open the **Admin** link on your laptop, enter player names, and click
   **"Create game."** A QR code appears — scan it or read the 6-character code
   aloud to everyone.

5. Players scan the QR (or visit `/join` and type the code), then tap their
   name from the list to get their ticket.

6. Press **"Draw Number"** to call each ball. It appears live on every phone.

7. Players tap squares to mark them. Claims are server-validated — no cheating.

8. **New round?** Click **"Start a new game"** on the admin screen.

---

## Troubleshooting

**Players can't open the link / QR doesn't work**
- Every device must be on the exact same Wi-Fi (not a guest network — many
  guest SSIDs block device-to-device traffic).
- If your OS asks whether to allow Node.js through the firewall, click Allow.

**The QR code shows the wrong address**
- Some laptops have multiple adapters (Wi-Fi + Ethernet + VPN). Disable
  Ethernet/VPN and restart the server to force the Wi-Fi address.

**Admin refreshed and QR code disappeared**
- The join code is stored in `localStorage` on the admin browser — refreshing
  on the same device brings it back. On a different device, create a new game.

---

## How it works

- `server.js` — single-file Node.js server using **only built-in modules** (no
  `npm install` ever).
- Game state lives **in memory** — simple, fast, resets on restart.
- Live updates use **Server-Sent Events** — built into every browser, no
  WebSocket library needed.
- Zero external services, zero database, zero tracking.

MIT License.
