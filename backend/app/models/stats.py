from datetime import datetime, date
from sqlalchemy import String, Integer, BigInteger, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class VideoStats(Base):
    __tablename__ = "video_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(Integer, ForeignKey("upload_schedules.id"), index=True)
    youtube_video_id: Mapped[str] = mapped_column(String(32), index=True)

    views: Mapped[int] = mapped_column(BigInteger, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    estimated_minutes_watched: Mapped[float] = mapped_column(Float, default=0.0)
    average_view_duration: Mapped[float] = mapped_column(Float, default=0.0)
    subscribers_gained: Mapped[int] = mapped_column(Integer, default=0)

    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    stats_date: Mapped[date | None] = mapped_column(Date, nullable=True)
