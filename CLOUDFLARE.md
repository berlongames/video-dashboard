# Deploy on Cloudflare Pages (+ backend example)

This repo is set up so **Cloudflare Pages** can host the React UI and a small **Pages Function** under `/api/*`.

## Architecture

| Layer | Where it runs |
|--------|----------------|
| Frontend (React/Vite) | Cloudflare Pages static assets |
| `/api/*` | Pages Function (`frontend/functions/api/[[path]].js`) |
| Real clipping / YouTube upload | Your VPS + Docker (`docker compose`) — optional proxy target |

Full AutoClip + Celery + FFmpeg **cannot** run inside Pages Functions. Use the Function as a **mock API** or as a **proxy** to your VPS.

## 1. Connect GitHub → Cloudflare Pages

You already installed the Cloudflare GitHub app. In the dashboard:

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select repo: `berlongames/video-dashboard`
3. Build settings:

   | Setting | Value |
   |---------|--------|
   | Production branch | `main` |
   | Root directory | `frontend` |
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

4. Environment variables (optional):

   | Name | Value |
   |------|--------|
   | `API_UPSTREAM` | `https://your-vps-or-tunnel.example.com` (no trailing slash) |
   | `VITE_API_BASE` | leave empty if same origin `/api` |

5. **Save and Deploy**

After deploy, the site URL looks like:

`https://video-dashboard-<hash>.pages.dev`

## 2. Backend modes

### A) Mock (default)

Do **not** set `API_UPSTREAM`. The Pages Function returns demo jobs/schedules so the UI works immediately.

### B) Proxy to real backend

1. Run the full stack on a VPS:

   ```bash
   git clone https://github.com/berlongames/video-dashboard.git
   cd video-dashboard && cp .env.example .env
   # edit .env, install AutoClip, YouTube token
   docker compose up -d --build
   ```

2. Expose HTTPS (Cloudflare Tunnel recommended):

   ```bash
   cloudflared tunnel create video-api
   cloudflared tunnel route dns video-api api.yourdomain.com
   # config.yml ingress → http://localhost:8000
   cloudflared tunnel run video-api
   ```

3. In Pages → **Settings** → **Environment variables**:

   `API_UPSTREAM=https://api.yourdomain.com`

4. Redeploy. All `/api/*` calls from the UI are proxied to FastAPI.

## 3. Local frontend against mock or real API

```bash
cd frontend
npm install
npm run dev
# uses Vite proxy → localhost:8000 by default
```

Or set in `.env`:

```
VITE_API_BASE=https://video-dashboard.pages.dev
```

## 4. Files added for Cloudflare

- `frontend/public/_redirects` – SPA fallback (`/* → /index.html`)
- `frontend/functions/api/[[path]].js` – mock + proxy backend example
- `wrangler.toml` – Pages project name / compatibility date
- `CLOUDFLARE.md` – this guide

## 5. Custom domain

Pages → **Custom domains** → add `dashboard.yourdomain.com` (DNS must be on Cloudflare).
