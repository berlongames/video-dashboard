from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum as SAEnum, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.database import Base


class ScheduleStatus(str, enum.Enum):
    pending = "pending"
    scheduled = "scheduled"
    uploading = "uploading"
    uploaded = "uploaded"
    failed = "failed"
    cancelled = "cancelled"


class UploadSchedule(Base):
    __tablename__ = "upload_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    clip_job_id: Mapped[int] = mapped_column(Integer, ForeignKey("clip_jobs.id"), index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[str] = mapped_column(String(512), default="")
    privacy: Mapped[str] = mapped_column(String(32), default="private")
    category_id: Mapped[str] = mapped_column(String(16), default="22")

    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    status: Mapped[str] = mapped_column(SAEnum(ScheduleStatus), default=ScheduleStatus.pending, index=True)

    youtube_video_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(256), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    auto_publish: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
