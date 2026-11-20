from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_secret_key: str = "change-me"
    admin_username: str = "admin"
    admin_password: str = "change-me"
    database_url: str = "sqlite:///./data/dashboard.db"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    autoclip_cmd: str = "autoclip"
    autoclip_data_dir: str = "/data/autoclip"
    autoclip_default_platform: str = "youtube_long"
    target_short_duration: int = 600
    min_clip_score: float = 0.55

    upload_dir: str = "/data/uploads"
    output_dir: str = "/data/outputs"
    temp_dir: str = "/data/temp"

    youtube_client_secrets: str = "/secrets/client_secrets.json"
    youtube_token_file: str = "/secrets/youtube_token.json"
    youtube_category_id: str = "22"
    youtube_privacy: str = "private"
    youtube_default_tags: str = "auto,clip,short"

    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
