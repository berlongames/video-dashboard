from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schedule import UploadSchedule, ScheduleStatus
from app.tasks.upload_tasks import upload_scheduled

router = APIRouter(prefix="/schedules", tags=["schedules"])


class ScheduleOut(BaseModel):
    id: int
    clip_job_id: int
    title: str
    description: str
    tags: str
    privacy: str
    scheduled_at: Optional[datetime]
    status: str
    youtube_video_id: Optional[str]
    youtube_url: Optional[str]
    error_message: Optional[str]
    auto_publish: bool
    created_at: datetime
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    privacy: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    auto_publish: Optional[bool] = None


@router.get("", response_model=List[ScheduleOut])
def list_schedules(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(UploadSchedule).order_by(UploadSchedule.id.desc())
    if status:
        q = q.filter(UploadSchedule.status == status)
    return q.limit(100).all()


@router.get("/{schedule_id}", response_model=ScheduleOut)
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    s = db.get(UploadSchedule, schedule_id)
    if not s:
        raise HTTPException(404, "Schedule not found")
    return s


@router.patch("/{schedule_id}", response_model=ScheduleOut)
def update_schedule(schedule_id: int, body: ScheduleUpdate, db: Session = Depends(get_db)):
    s = db.get(UploadSchedule, schedule_id)
    if not s:
        raise HTTPException(404, "Schedule not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    if s.scheduled_at and s.status == ScheduleStatus.pending:
        s.status = ScheduleStatus.scheduled
    db.commit()
    db.refresh(s)
    return s


@router.post("/{schedule_id}/upload-now", response_model=ScheduleOut)
def upload_now(schedule_id: int, db: Session = Depends(get_db)):
    s = db.get(UploadSchedule, schedule_id)
    if not s:
        raise HTTPException(404, "Schedule not found")
    if s.status == ScheduleStatus.uploaded:
        raise HTTPException(400, "Already uploaded")
    s.scheduled_at = datetime.utcnow()
    s.status = ScheduleStatus.scheduled
    db.commit()
    upload_scheduled.delay(s.id)
    db.refresh(s)
    return s
