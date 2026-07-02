# Deploying Virtual Bingo

Two options: **Render** (recommended, fully automated) or **Glitch** (no GitHub needed).

---

## Option A: Render + GitHub Actions (recommended)

This repo ships with `render.yaml` (Render Blueprint) and
`.github/workflows/deploy.yml` (GitHub Actions auto-redeploy). Once wired up,
every `git push` to `main` automatically redeploys.

### Step 1 — Fork or clone the repo to GitHub

If you're reading this from a local copy:

```bash
# Inside the virtual-bingo folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/virtual-bingo.git
git push -u origin main
```

The repo must be **Public** for Render's free tier. (Private repos work on paid
Render plans.)

### Step 2 — Deploy via Render Blueprint

1. Go to **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**
3. Connect your GitHub account if prompted, then select the `virtual-bingo` repo
4. Render detects `render.yaml` and shows a pre-configured web service:
   - Plan: Free
   - Build command: _(none)_
   - Start command: `node server.js`
5. Click **Apply**
6. Wait 1–2 minutes for the first deploy

You'll get a permanent URL:
```
https://virtual-bingo-xxxx.onrender.com
```

Bookmark this — it's your game URL forever (even across server restarts and re-deploys).

### Step 3 — Wire up auto-redeploy

`render.yaml` has `autoDeploy: true`, so Render already watches your GitHub repo.
The GitHub Actions workflow is an additional trigger — useful for manually
re-kicking a deploy from the Actions tab without a code change.

To enable it:

1. **On Render:** open your `virtual-bingo` service → **Settings** → scroll to
   **Deploy Hook** → copy that URL (looks like
   `https://api.render.com/deploy/srv-xxxxx?key=yyyy`)

2. **On GitHub:** go to your repo → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: the URL from step 1

3. Click **Add secret**. Done — the next `git push` triggers both Render's own
   watcher and the Actions workflow.

### Step 4 — Verify the deployment

Open a phone on **mobile data** (not your home Wi-Fi) and visit:
```
https://your-app.onrender.com/admin
```

- Click **"Open Lobby"** — you should see a QR code
- The QR URL should start with `https://your-app.onrender.com`, not `192.168.x.x`
- Scan the QR from a second device — the join page should load
- Create a game, draw a number — confirm it appears on the second device

If the QR shows a local IP address, your admin page was opened from a local
server rather than the Render URL. Always access admin from the Render URL when
playing over the internet.

---

## Free tier behaviour

| Behaviour | Detail |
|-----------|--------|
| Sleep after idle | Server sleeps after ~15 min of no traffic |
| Wake time | First request after sleep takes 20–50 seconds |
| Memory on wake | In-memory game state is **lost** on sleep/restart — start a new game |
| Preventing sleep | Keep at least one browser tab open and active during a live game |
| Cost | Free, indefinitely — no credit card required |

---

## Option B: Glitch (no GitHub needed)

If you'd rather skip GitHub/Render entirely:

1. Go to **https://glitch.com** → create a free account
2. Click **New Project** → **Import from GitHub** (paste your repo URL) — or
   start from the `glitch-hello-node` template and drag-and-drop the files in
3. Glitch starts the server automatically and gives you a URL like
   `https://virtual-bingo.glitch.me`
4. Share that URL as the join link

Same free-tier sleep behaviour as Render applies. Glitch is simpler to set up
but has less control over the environment.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4590` | Port the server listens on (Render sets this automatically) |

No other environment variables are required. There are no API keys, database
URLs, or secrets needed to run the app.

---

## render.yaml reference

```yaml
services:
  - type: web
    name: virtual-bingo
    env: node
    plan: free
    buildCommand: ""
    startCommand: node server.js
    autoDeploy: true
```

- `buildCommand: ""` — no build step needed (zero dependencies)
- `startCommand: node server.js` — runs the server directly
- `autoDeploy: true` — Render redeploys automatically on every push to `main`

---

## GitHub Actions reference

`.github/workflows/deploy.yml` sends a POST request to the Render deploy hook
URL on every push to `main`. It requires the `RENDER_DEPLOY_HOOK_URL` repository
secret (see Step 3 above).

This is a belt-and-suspenders setup alongside Render's own auto-deploy — useful
for manually triggering a redeploy from the GitHub Actions tab without needing
to push a code change.

---

## Local development

```bash
node server.js
# Admin: http://localhost:4590/admin
# Players: http://localhost:4590/join
# Spectate: http://localhost:4590/spectate
```

For LAN play (same Wi-Fi), use the IP address printed in the console instead of
`localhost` — players on other devices can't reach `localhost` on your machine.

```bash
PORT=8080 node server.js   # custom port if 4590 is in use
```
