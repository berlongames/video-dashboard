from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.schedule import UploadSchedule, ScheduleStatus
from app.models.stats import VideoStats

router = APIRouter(prefix="/stats", tags=["stats"])


class StatsOut(BaseModel):
    id: int
    schedule_id: int
    youtube_video_id: str
    views: int
    likes: int
    comments: int
    estimated_minutes_watched: float
    recorded_at: str

    class Config:
        from_attributes = True


class SummaryOut(BaseModel):
    total_uploads: int
    total_views: int
    total_likes: int
    total_comments: int
    recent: List[dict]


@router.get("/summary", response_model=SummaryOut)
def summary(db: Session = Depends(get_db)):
    uploads = (
        db.query(UploadSchedule)
        .filter(UploadSchedule.status == ScheduleStatus.uploaded)
        .count()
    )

    subq = (
        db.query(
            VideoStats.youtube_video_id,
            func.max(VideoStats.id).label("max_id"),
        )
        .group_by(VideoStats.youtube_video_id)
        .subquery()
    )
    latest = (
        db.query(VideoStats)
        .join(subq, VideoStats.id == subq.c.max_id)
        .all()
    )

    total_views = sum(s.views for s in latest)
    total_likes = sum(s.likes for s in latest)
    total_comments = sum(s.comments for s in latest)

    recent = []
    for s in sorted(latest, key=lambda x: x.views, reverse=True)[:20]:
        sched = db.get(UploadSchedule, s.schedule_id)
        recent.append(
            {
                "youtube_video_id": s.youtube_video_id,
                "title": sched.title if sched else "",
                "url": sched.youtube_url if sched else "",
                "views": s.views,
                "likes": s.likes,
                "comments": s.comments,
                "recorded_at": s.recorded_at.isoformat() if s.recorded_at else None,
            }
        )

    return SummaryOut(
        total_uploads=uploads,
        total_views=total_views,
        total_likes=total_likes,
        total_comments=total_comments,
        recent=recent,
    )


@router.get("/video/{youtube_video_id}", response_model=List[StatsOut])
def video_history(youtube_video_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(VideoStats)
        .filter(VideoStats.youtube_video_id == youtube_video_id)
        .order_by(VideoStats.recorded_at.desc())
        .limit(100)
        .all()
    )
    return rows
