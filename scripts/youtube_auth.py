#!/usr/bin/env python3
"""One-time YouTube OAuth helper."""

from pathlib import Path
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / "secrets" / "client_secrets.json"
TOKEN = ROOT / "secrets" / "youtube_token.json"


def main():
    if not SECRETS.exists():
        print(f"Missing {SECRETS}")
        print("Download OAuth client JSON from Google Cloud Console and place it there.")
        sys.exit(1)

    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    flow = InstalledAppFlow.from_client_secrets_file(str(SECRETS), SCOPES)
    creds = flow.run_local_server(port=0)
    TOKEN.write_text(creds.to_json())
    print(f"Token saved → {TOKEN}")


if __name__ == "__main__":
    main()
