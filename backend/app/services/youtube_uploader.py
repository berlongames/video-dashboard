"""YouTube upload helper using google-api-python-client + OAuth token."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class YouTubeUploadError(Exception):
    pass


def _get_youtube_service():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request

    token_path = Path(settings.youtube_token_file)
    if not token_path.exists():
        raise YouTubeUploadError(
            f"YouTube token not found at {token_path}. "
            "Run scripts/youtube_auth.py first."
        )

    creds = Credentials.from_authorized_user_file(
        str(token_path),
        scopes=[
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
        ],
    )
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json())

    return build("youtube", "v3", credentials=creds)


def upload_video(
    file_path: str,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    category_id: str | None = None,
    privacy: str | None = None,
) -> dict[str, Any]:
    from googleapiclient.http import MediaFileUpload

    if not Path(file_path).exists():
        raise YouTubeUploadError(f"File not found: {file_path}")

    youtube = _get_youtube_service()
    tags = tags or [t.strip() for t in settings.youtube_default_tags.split(",") if t.strip()]
    category_id = category_id or settings.youtube_category_id
    privacy = privacy or settings.youtube_privacy

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags,
            "categoryId": category_id,
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(file_path, chunksize=8 * 1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            logger.info("Upload progress: %s%%", int(status.progress() * 100))

    video_id = response.get("id")
    return {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "raw": response,
    }


def fetch_basic_stats(video_id: str) -> dict[str, Any]:
    youtube = _get_youtube_service()
    resp = (
        youtube.videos()
        .list(part="statistics,contentDetails", id=video_id)
        .execute()
    )
    items = resp.get("items") or []
    if not items:
        return {}
    stats = items[0].get("statistics", {})
    return {
        "views": int(stats.get("viewCount", 0)),
        "likes": int(stats.get("likeCount", 0)),
        "comments": int(stats.get("commentCount", 0)),
    }
