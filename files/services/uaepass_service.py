"""
services/uaepass_service.py

Fetches real user identity from UAE PASS user-info endpoint.
Requires UAEPASS_ACCESS_TOKEN env var to be set; falls back gracefully.
"""

import os
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

UAEPASS_USERINFO_URL = os.getenv(
    "UAEPASS_USERINFO_URL",
    "https://stg-id.uaepass.ae/idshub/userinfo",
)


def _normalize_id(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


async def fetch_uaepass_profile(emirates_id: str) -> Optional[dict]:
    """
    Returns a dict of UAE PASS profile fields if the call succeeds and the
    returned idn matches emirates_id. Returns None on any failure or if the
    access token is not configured (caller should fall back to local data).
    """
    access_token = os.getenv("UAEPASS_ACCESS_TOKEN", "").strip()
    if not access_token:
        logger.info("UAEPASS_ACCESS_TOKEN not set — skipping live identity fetch")
        return None

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                UAEPASS_USERINFO_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("UAE PASS request failed: %s", exc)
        return None

    if response.status_code != 200:
        logger.warning("UAE PASS returned HTTP %s", response.status_code)
        return None

    profile = response.json()

    # Validate that the returned idn matches the requested Emirates ID
    returned_id = _normalize_id(profile.get("idn", ""))
    requested_id = _normalize_id(emirates_id)
    if requested_id and returned_id and returned_id != requested_id:
        logger.warning(
            "Emirates ID mismatch: requested=%s uaepass=%s",
            requested_id,
            returned_id,
        )
        return None

    return profile
