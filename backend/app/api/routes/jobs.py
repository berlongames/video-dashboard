from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.job import ClipJob, JobStatus, JobType
from app.tasks.clip_tasks import run_clip_job

router = APIRouter(prefix="/jobs", tags=["jobs"])
settings = get_settings()


class JobOut(BaseModel):
    id: int
    title: str
    job_type: str
    status: str
    source_paths: list
    source_names: list
    output_path: Optional[str]
    output_duration: Optional[float]
    progress: float
    stage: str
    error_message: Optional[str]
    target_duration: int
    platform: str
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("", response_model=List[JobOut])
def list_jobs(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(ClipJob).order_by(ClipJob.id.desc())
    if status:
        q = q.filter(ClipJob.status == status)
    return q.limit(100).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ClipJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("", response_model=JobOut)
async def create_job(
    title: str = Form(""),
    job_type: str = Form("single"),
    target_duration: int = Form(600),
    platform: str = Form("youtube_long"),
    source_urls: str = Form(""),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    saved_names: list[str] = []

    for f in files:
        if not f.filename:
            continue
        dest = Path(settings.upload_dir) / f"{datetime.utcnow().timestamp():.0f}_{f.filename}"
        with dest.open("wb") as out:
            shutil.copyfileobj(f.file, out)
        saved_paths.append(str(dest))
        saved_names.append(f.filename)

    urls = [u.strip() for u in source_urls.split(",") if u.strip()]
    for u in urls:
        saved_paths.append(u)
        saved_names.append(u)

    if not saved_paths:
        raise HTTPException(400, "Provide at least one file or URL")

    jtype = JobType.compilation if (job_type == "compilation" or len(saved_paths) > 1) else JobType.single

    job = ClipJob(
        title=title or (saved_names[0] if saved_names else "Untitled"),
        job_type=jtype,
        status=JobStatus.pending,
        source_paths=saved_paths,
        source_names=saved_names,
        target_duration=target_duration,
        platform=platform,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    run_clip_job.delay(job.id)
    return job


@router.post("/{job_id}/retry", response_model=JobOut)
def retry_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ClipJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    job.status = JobStatus.pending
    job.error_message = None
    job.progress = 0.0
    job.stage = ""
    db.commit()
    run_clip_job.delay(job.id)
    return job


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ClipJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    db.delete(job)
    db.commit()
    return {"ok": True}
