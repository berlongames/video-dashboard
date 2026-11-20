# Deploy on Cloudflare Pages (+ backend example)

This repo is set up so **Cloudflare Pages** can host the React UI and a small **Pages Function** under `/api/*`.

## Architecture

| Layer | Where it runs |
|--------|----------------|
| Frontend (React/Vite) | Cloudflare Pages static assets |
| `/api/*` | Pages Function (`functions/api/[[path]].js`) |
| Real clipping / YouTube upload | Your VPS + Docker (`docker compose`) — optional proxy target |

Full AutoClip + Celery + FFmpeg **cannot** run inside Pages Functions. Use the Function as a **mock API** or as a **proxy** to your VPS.

## Fix for `ENOENT package.json`

Pages was building from the **repo root**, but `package.json` lived only under `frontend/`.
There is now a **root** `package.json` whose `build` script builds the frontend.

### Recommended build settings (repo root)

In **Workers & Pages** → your project → **Settings** → **Builds & deployments**:

| Setting | Value |
|---------|--------|
| Production branch | `main` |
| Root directory | *(leave empty)* |
| Build command | `npm run build` |
| Build output directory | `frontend/dist` |

Then **Retry deployment**.

### Alternative: root directory = `frontend`

| Setting | Value |
|---------|--------|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

(With this option, Functions under `frontend/functions/` are used.)

## Environment variables (optional)

| Name | Value |
|------|--------|
| `API_UPSTREAM` | `https://your-vps-or-tunnel.example.com` (no trailing slash) |
| `VITE_API_BASE` | leave empty if same origin `/api` |

## Backend modes

### A) Mock (default)

Do **not** set `API_UPSTREAM`. The Pages Function returns demo jobs/schedules so the UI works immediately.

### B) Proxy to real backend

1. Run the full stack on a VPS with `docker compose up -d --build`
2. Expose it via Cloudflare Tunnel (or any HTTPS URL)
3. Set `API_UPSTREAM=https://api.yourdomain.com` on the Pages project
4. Redeploy

## Local dev

```bash
cd frontend
npm install
npm run dev
```

## Custom domain

Pages → **Custom domains** → add your hostname (zone on Cloudflare).
