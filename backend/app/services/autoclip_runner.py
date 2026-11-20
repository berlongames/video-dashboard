"""Wrapper around AutoClip CLI."""

from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AutoClipError(Exception):
    pass


def _run(cmd: list[str], timeout: int = 3600) -> subprocess.CompletedProcess:
    logger.info("Running: %s", " ".join(cmd))
    env = os.environ.copy()
    if settings.autoclip_data_dir:
        env["AUTOCLIP_DATA_DIR"] = settings.autoclip_data_dir
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=env,
    )


def produce_single(
    source_path: str,
    target_duration: int | None = None,
    platform: str | None = None,
) -> dict[str, Any]:
    platform = platform or settings.autoclip_default_platform
    target_duration = target_duration or settings.target_short_duration

    cmd = [
        settings.autoclip_cmd,
        "produce",
        source_path,
        "--platform",
        platform,
        "--json",
    ]

    try:
        result = _run(cmd, timeout=7200)
    except FileNotFoundError:
        raise AutoClipError(
            f"AutoClip command not found: '{settings.autoclip_cmd}'. "
            "Install AutoClip CLI or set AUTOCLIP_CMD."
        )
    except subprocess.TimeoutExpired:
        raise AutoClipError("AutoClip timed out")

    if result.returncode != 0:
        logger.warning("produce failed, trying classic run. stderr=%s", result.stderr[-800:])
        return _run_classic(source_path, platform)

    try:
        data = json.loads(result.stdout.strip() or "{}")
    except json.JSONDecodeError:
        data = {"project_id": result.stdout.strip(), "raw_stdout": result.stdout}

    data["ok"] = result.returncode == 0
    data["stderr"] = result.stderr[-2000:] if result.stderr else ""
    return data


def _run_classic(source_path: str, platform: str) -> dict[str, Any]:
    cmd = [settings.autoclip_cmd, "run", source_path, "--json"]
    result = _run(cmd, timeout=7200)
    if result.returncode != 0:
        raise AutoClipError(
            f"AutoClip failed (code {result.returncode}): {result.stderr[-1000:]}"
        )
    try:
        data = json.loads(result.stdout.strip() or "{}")
    except json.JSONDecodeError:
        data = {"project_id": result.stdout.strip()}
    data["ok"] = True
    return data


def build_compilation(
    source_paths: list[str],
    output_path: str,
    target_duration: int | None = None,
) -> dict[str, Any]:
    target_duration = target_duration or settings.target_short_duration
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    list_file = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
    try:
        for p in source_paths:
            list_file.write(f"file '{os.path.abspath(p)}'\n")
        list_file.close()

        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_file.name, "-c", "copy", "-t", str(target_duration),
            output_path,
        ]
        result = _run(cmd, timeout=1800)
        if result.returncode != 0:
            raise AutoClipError(f"FFmpeg concat failed: {result.stderr[-800:]}")

        return {
            "ok": True,
            "output_path": output_path,
            "sources": source_paths,
            "method": "ffmpeg_concat",
        }
    finally:
        try:
            os.unlink(list_file.name)
        except OSError:
            pass


def get_output_path_from_result(result: dict[str, Any]) -> str | None:
    if result.get("output_path"):
        return result["output_path"]
    clips = result.get("clips") or []
    if clips and isinstance(clips, list):
        first = clips[0]
        if isinstance(first, dict) and first.get("file"):
            return first["file"]
    collections = result.get("collections") or []
    if collections and isinstance(collections, list):
        c = collections[0]
        if isinstance(c, dict) and c.get("file"):
            return c["file"]
    return None
