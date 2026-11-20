# Video Dashboard – AutoClip + YouTube Auto-Upload

Web dashboard that turns long videos (~20 min) into shorter cuts (~10 min) using **[AutoClip](https://github.com/zhouxiaoka/autoclip)** as the background engine, then schedules automatic YouTube uploads and shows admin statistics. Also supports compilations from multiple source files.

## Features

- **Clip jobs**: Upload local video or paste YouTube/Bilibili URL → AutoClip produces short version / highlights
- **Target length**: Configurable (default ~8–12 min for “short” form from 20 min sources)
- **Compilations**: Select multiple full videos → generate a single combined short
- **Upload schedule**: After cutting finishes, job moves to schedule queue → auto-upload to YouTube at chosen time
- **Admin statistics**: After upload, pull views / watch time / engagement via YouTube Analytics
- **Background workers**: Celery + Redis (or simple RQ fallback)
- **Auth**: Simple admin login (extendable)

## Quick Start

### 1. Prerequisites

- Docker + Docker Compose (recommended)
- Or: Python 3.11+, Node 20+, FFmpeg, Redis
- AutoClip installed (CLI) or use the provided Docker service
- YouTube Data API credentials (OAuth client + optional Analytics)

### 2. Clone & configure

```bash
cd video-dashboard
cp .env.example .env
# Edit .env: AUTOCLIP path, YouTube client secrets, admin password, etc.
```

### 3. Run with Docker

```bash
docker compose up -d --build
```

- Dashboard: http://localhost:5173
- API docs: http://localhost:8000/docs
- Flower (optional): http://localhost:5555

### 4. Local dev (without full Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Worker (another terminal)
celery -A app.celery_app worker -l info

# Frontend
cd frontend
npm install
npm run dev
```

## How AutoClip is used

The worker calls AutoClip CLI:

```bash
autoclip produce /path/to/source.mp4 \
  --platform youtube_long \
  --json
# or for classic short clips:
autoclip run /path/to/source.mp4 --json
```

You can also point the worker at an already-running AutoClip Docker instance and use its HTTP API / MCP.

For longer “10 min” outputs the system can:

1. Ask AutoClip for high-score segments
2. Concatenate selected segments with FFmpeg to reach the target duration
3. Or use compilation mode across multiple source files

## Project layout

```
video-dashboard/
├── backend/          # FastAPI app, models, YouTube client, job logic
├── frontend/         # React dashboard
├── workers/          # Celery tasks (clip + upload)
├── scripts/          # helpers (install autoclip, youtube auth)
├── docker-compose.yml
└── .env.example
```

## YouTube setup

1. Create a project in Google Cloud Console
2. Enable YouTube Data API v3 + YouTube Analytics API
3. Create OAuth 2.0 Client ID (Desktop or Web)
4. Download `client_secrets.json` → put path in `.env`
5. Run `python scripts/youtube_auth.py` once to generate token

## License

MIT (dashboard code). AutoClip itself is MIT – see upstream repo.
