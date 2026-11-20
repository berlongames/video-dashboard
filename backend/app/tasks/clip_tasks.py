from __future__ import annotations

import logging
import shutil
from datetime import datetime
from pathlib import Path

from app.celery_app import celery_app
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.job import ClipJob, JobStatus, JobType
from app.models.schedule import UploadSchedule, ScheduleStatus
from app.services.autoclip_runner import (
    AutoClipError,
    produce_single,
    build_compilation,
    get_output_path_from_result,
)

logger = logging.getLogger(__name__)
settings = get_settings()


@celery_app.task(bind=True, name="app.tasks.clip_tasks.run_clip_job", max_retries=1)
def run_clip_job(self, job_id: int):
    db = SessionLocal()
    try:
        job = db.get(ClipJob, job_id)
        if not job:
            logger.error("Job %s not found", job_id)
            return

        job.status = JobStatus.processing
        job.stage = "starting"
        job.progress = 0.05
        db.commit()

        Path(settings.output_dir).mkdir(parents=True, exist_ok=True)
        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)

        sources = job.source_paths or []
        if not sources:
            raise AutoClipError("No source paths on job")

        if job.job_type == JobType.compilation or len(sources) > 1:
            out_name = f"compilation_{job.id}_{int(datetime.utcnow().timestamp())}.mp4"
            out_path = str(Path(settings.output_dir) / out_name)
            job.stage = "compiling"
            job.progress = 0.2
            db.commit()

            result = build_compilation(
                sources, out_path, target_duration=job.target_duration
            )
            final_path = result.get("output_path")
        else:
            job.stage = "autoclip"
            job.progress = 0.15
            db.commit()

            result = produce_single(
                sources[0],
                target_duration=job.target_duration,
                platform=job.platform,
            )
            final_path = get_output_path_from_result(result)

            if final_path and Path(final_path).exists():
                dest = Path(settings.output_dir) / f"job_{job.id}_{Path(final_path).name}"
                shutil.copy2(final_path, dest)
                final_path = str(dest)

        if not final_path or not Path(final_path).exists():
            raise AutoClipError("No output video produced")

        job.output_path = final_path
        job.autoclip_project_id = result.get("project_id")
        job.meta = {**(job.meta or {}), "autoclip_result_keys": list(result.keys())}
        job.status = JobStatus.completed
        job.stage = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        db.commit()

        schedule = UploadSchedule(
            clip_job_id=job.id,
            title=job.title or Path(final_path).stem,
            description="",
            tags=settings.youtube_default_tags,
            privacy=settings.youtube_privacy,
            category_id=settings.youtube_category_id,
            status=ScheduleStatus.pending,
            auto_publish=True,
        )
        db.add(schedule)
        db.commit()

        logger.info("Job %s completed → %s", job_id, final_path)
        return {"job_id": job_id, "output_path": final_path}

    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        job = db.get(ClipJob, job_id)
        if job:
            job.status = JobStatus.failed
            job.error_message = str(exc)[:2000]
            job.stage = "failed"
            db.commit()
        raise
    finally:
        db.close()
