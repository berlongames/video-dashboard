from __future__ import annotations

import logging
from datetime import datetime

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.job import ClipJob
from app.models.schedule import UploadSchedule, ScheduleStatus
from app.models.stats import VideoStats
from app.services.youtube_uploader import (
    YouTubeUploadError,
    upload_video,
    fetch_basic_stats,
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.upload_tasks.upload_scheduled", max_retries=2)
def upload_scheduled(self, schedule_id: int):
    db = SessionLocal()
    try:
        schedule = db.get(UploadSchedule, schedule_id)
        if not schedule:
            return
        if schedule.status not in (ScheduleStatus.pending, ScheduleStatus.scheduled):
            return

        job = db.get(ClipJob, schedule.clip_job_id)
        if not job or not job.output_path:
            schedule.status = ScheduleStatus.failed
            schedule.error_message = "No output file from clip job"
            db.commit()
            return

        schedule.status = ScheduleStatus.uploading
        db.commit()

        tags = [t.strip() for t in (schedule.tags or "").split(",") if t.strip()]
        result = upload_video(
            file_path=job.output_path,
            title=schedule.title,
            description=schedule.description or "",
            tags=tags,
            category_id=schedule.category_id,
            privacy=schedule.privacy,
        )

        schedule.youtube_video_id = result["video_id"]
        schedule.youtube_url = result["url"]
        schedule.status = ScheduleStatus.uploaded
        schedule.uploaded_at = datetime.utcnow()
        db.commit()

        try:
            stats_data = fetch_basic_stats(result["video_id"])
            vs = VideoStats(
                schedule_id=schedule.id,
                youtube_video_id=result["video_id"],
                views=stats_data.get("views", 0),
                likes=stats_data.get("likes", 0),
                comments=stats_data.get("comments", 0),
            )
            db.add(vs)
            db.commit()
        except Exception:
            logger.exception("Initial stats fetch failed for %s", result["video_id"])

        logger.info("Uploaded schedule %s → %s", schedule_id, result["url"])
        return result

    except YouTubeUploadError as exc:
        schedule = db.get(UploadSchedule, schedule_id)
        if schedule:
            schedule.status = ScheduleStatus.failed
            schedule.error_message = str(exc)[:2000]
            db.commit()
        raise
    except Exception as exc:
        logger.exception("Upload failed for schedule %s", schedule_id)
        schedule = db.get(UploadSchedule, schedule_id)
        if schedule:
            schedule.status = ScheduleStatus.failed
            schedule.error_message = str(exc)[:2000]
            db.commit()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.upload_tasks.process_due_schedules")
def process_due_schedules():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due = (
            db.query(UploadSchedule)
            .filter(
                UploadSchedule.status.in_([ScheduleStatus.pending, ScheduleStatus.scheduled]),
                UploadSchedule.auto_publish.is_(True),
            )
            .all()
        )
        for s in due:
            if s.scheduled_at is None or s.scheduled_at <= now:
                upload_scheduled.delay(s.id)
                s.status = ScheduleStatus.scheduled
        db.commit()
    finally:
        db.close()


@celery_app.task(name="app.tasks.upload_tasks.refresh_all_stats")
def refresh_all_stats():
    db = SessionLocal()
    try:
        uploaded = (
            db.query(UploadSchedule)
            .filter(UploadSchedule.status == ScheduleStatus.uploaded)
            .filter(UploadSchedule.youtube_video_id.isnot(None))
            .all()
        )
        for s in uploaded:
            try:
                data = fetch_basic_stats(s.youtube_video_id)
                vs = VideoStats(
                    schedule_id=s.id,
                    youtube_video_id=s.youtube_video_id,
                    views=data.get("views", 0),
                    likes=data.get("likes", 0),
                    comments=data.get("comments", 0),
                )
                db.add(vs)
            except Exception:
                logger.exception("Stats refresh failed for %s", s.youtube_video_id)
        db.commit()
    finally:
        db.close()
