from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.database import Base


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class JobType(str, enum.Enum):
    single = "single"
    compilation = "compilation"


class ClipJob(Base):
    __tablename__ = "clip_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    job_type: Mapped[str] = mapped_column(SAEnum(JobType), default=JobType.single)
    status: Mapped[str] = mapped_column(SAEnum(JobStatus), default=JobStatus.pending, index=True)

    source_paths: Mapped[dict] = mapped_column(JSON, default=list)
    source_names: Mapped[dict] = mapped_column(JSON, default=list)

    output_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    cover_path: Mapped[str | None] = mapped_column(String(512), nullable=True)

    autoclip_project_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_duration: Mapped[int] = mapped_column(Integer, default=600)
    platform: Mapped[str] = mapped_column(String(64), default="youtube_long")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    stage: Mapped[str] = mapped_column(String(64), default="")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
