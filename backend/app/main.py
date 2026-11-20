from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import init_db
from app.api.routes import jobs, schedules, stats, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    for d in (settings.upload_dir, settings.output_dir, settings.temp_dir):
        Path(d).mkdir(parents=True, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title="Video Dashboard API",
    description="AutoClip-powered short video pipeline + YouTube auto-upload + stats",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "video-dashboard"}


outputs = Path(settings.output_dir)
if outputs.exists():
    app.mount("/media/outputs", StaticFiles(directory=str(outputs)), name="outputs")
