# 🌐 Deploying Virtual Bingo for free (so mobile-only players can join too)

This repo is already set up for exactly one path: push to GitHub, deploy to
Render, with GitHub Actions automatically re-deploying on every future push.

## Step 1 — Create the GitHub repo

1. Go to **https://github.com/new** (while logged in as `tummala-hareesh`).
2. Repository name: `family-bingo` (or whatever you like).
3. Leave it **Public** (Render's free tier needs this, or a paid Render plan
   for private repos) — there's no secret data in this code, so public is fine.
4. Don't initialize with a README (this project already has one) — leave
   all the checkboxes unchecked.
5. Click **Create repository**.
6. On the next page, under **"…or push an existing repository from the
   command line"**, run those three commands from inside the unzipped
   `family-bingo` folder (open Terminal/Command Prompt there):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tummala-hareesh/family-bingo.git
   git push -u origin main
   ```
   (If `git` isn't installed, grab it free from **https://git-scm.com** first.)

## Step 2 — Deploy to Render with the included Blueprint

This repo includes a `render.yaml` file, which Render reads automatically to
configure the service — no manual form-filling needed.

1. Go to **https://dashboard.render.com/blueprints**
2. Click **New Blueprint Instance**.
3. Connect your GitHub account if prompted, then select the `family-bingo`
   repo you just pushed.
4. Render will detect `render.yaml` and show you the `family-bingo` web
   service, pre-configured (free plan, no build step, `node server.js` as
   the start command). Click **Apply**.
5. Wait 1–2 minutes for the first deploy. You'll get a URL like:
   `https://family-bingo-xyz.onrender.com`

## Step 3 — Wire up GitHub Actions (auto-redeploy on every push)

The repo already includes `.github/workflows/deploy.yml`, which pings Render
every time you push to `main`. It just needs one secret to know *which*
Render service to redeploy:

1. On Render, open your `family-bingo` service → **Settings** → scroll to
   **Deploy Hook** → copy that URL.
2. On GitHub, go to your repo → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**.
3. Name: `RENDER_DEPLOY_HOOK_URL`, Value: the URL you just copied. Save.

That's it — from now on, any `git push` to `main` automatically redeploys.
(Render's own GitHub integration would actually do this even without the
Action, since `autoDeploy: true` is set in `render.yaml` — the Action is
there because you specifically asked for GitHub Actions to drive it, and
it's also handy for manually re-triggering a deploy from the Actions tab
without needing a code change.)

## Step 4 — Play

- Open `https://family-bingo-xyz.onrender.com/admin` yourself, create the
  game, and share the QR code / join code shown there with everyone.
- Anyone with that link can join from any phone, on any network — no Wi-Fi
  matching needed anymore.

## Good to know

- The **free tier sleeps after ~15 minutes of no traffic**. The first
  visitor after a gap will see it load slowly (20–50 seconds) while it wakes
  up — normal, just wait it out.
- Since the game lives in memory, if it sleeps *mid-game*, that game's state
  resets on wake. Keep at least one tab open and interacting during a live
  session to avoid this.
- To play again another day, just reopen `/admin` and create a new game —
  the deployed app stays live indefinitely (it just sleeps between uses).

---

## Alternative: Glitch.com (no GitHub/Actions needed)

If you'd rather skip GitHub entirely:

1. Go to **https://glitch.com** → sign up free.
2. **New Project** → **Import from GitHub** (if you did Step 1 above) or
   start from **glitch-hello-node** and paste in the files manually.
3. Glitch auto-installs and gives you a URL like `family-bingo.glitch.me`
   immediately.
4. Same free-tier sleep behavior applies.

Nothing about how the game works changes between these options — only
where it physically runs.
