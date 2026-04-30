"""
services/uaepass_service.py

UAE PASS is the UAE government's national digital identity platform.
In production you would:
  1. Obtain an OAuth2 access token via UAE PASS SSO.
  2. Call the UAE PASS profile API with the bearer token.
  3. Parse and return the user's verified identity fields.

This file provides:
  - A realistic stub that returns dummy verified profiles for known Emirates IDs
    (so the rest of the pipeline works end-to-end without real credentials).
  - A production-ready placeholder showing exactly where to plug in real API calls.

To switch to real UAE PASS:
  - Set UAEPASS_CLIENT_ID and UAEPASS_CLIENT_SECRET in your .env file.
  - Replace the body of _fetch_real_uaepass_profile() with actual API calls.
"""

import os
import json
from pathlib import Path
from typing import Optional

# ── Stub data ──────────────────────────────────────────────────────────────────
# Mirrors the field names returned by the real UAE PASS /userinfo endpoint.

_STUB_PROFILES = {
    "784-1985-1234567-1": {
        "uuid":           "ae-uaepass-001",
        "fullnameEN":     "Ahmed Al-Mansoori",
        "fullnameAR":     "أحمد المنصوري",
        "nationalityEN":  "UAE",
        "nationalityAR":  "الإمارات",
        "gender":         "Male",
        "mobile":         "+971 50 123 4567",
        "email":          "ahmed.almansoori@email.ae",
        "idn":            "784-1985-1234567-1",
        "verified":       True,
    },
    "784-1990-2345678-2": {
        "uuid":           "ae-uaepass-002",
        "fullnameEN":     "Hassan Al-Nahyan",
        "fullnameAR":     "حسن آل نهيان",
        "nationalityEN":  "UAE",
        "nationalityAR":  "الإمارات",
        "gender":         "Male",
        "mobile":         "+971 52 234 5678",
        "email":          "hassan.alnahyan@email.ae",
        "idn":            "784-1990-2345678-2",
        "verified":       True,
    },
    "784-1978-3456789-3": {
        "uuid":           "ae-uaepass-003",
        "fullnameEN":     "Sara Al-Rashidi",
        "fullnameAR":     "سارة الراشدي",
        "nationalityEN":  "UAE",
        "nationalityAR":  "الإمارات",
        "gender":         "Female",
        "mobile":         "+971 55 345 6789",
        "email":          "sara.alrashidi@email.ae",
        "idn":            "784-1978-3456789-3",
        "verified":       True,
    },
}


# ── Public function ────────────────────────────────────────────────────────────

async def fetch_uaepass_profile(emirates_id: str) -> Optional[dict]:
    """
    Returns a UAE PASS verified identity dict for the given Emirates ID,
    or None if the ID is not found / UAE PASS is unavailable.

    In production: swap the stub lookup for _fetch_real_uaepass_profile().
    """
    # ── Production path (commented out until credentials are configured) ───
    # client_id     = os.getenv("UAEPASS_CLIENT_ID")
    # client_secret = os.getenv("UAEPASS_CLIENT_SECRET")
    # if client_id and client_secret:
    #     return await _fetch_real_uaepass_profile(emirates_id, client_id, client_secret)

    # ── Stub path ─────────────────────────────────────────────────────────
    return _STUB_PROFILES.get(emirates_id)


# ── Production placeholder ─────────────────────────────────────────────────────

async def _fetch_real_uaepass_profile(
    emirates_id: str,
    client_id: str,
    client_secret: str,
) -> Optional[dict]:
    """
    Placeholder for the real UAE PASS API integration.

    UAE PASS API flow:
    1. POST /idshub/token  → get access_token (client_credentials grant)
    2. GET  /userinfo      → get user profile (bearer token)

    Docs: https://docs.uaepass.ae/
    """
    import httpx

    UAEPASS_BASE    = "https://id.uaepass.ae"    # production endpoint
    # UAEPASS_BASE  = "https://stg-id.uaepass.ae"  # staging

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: obtain token
            token_resp = await client.post(
                f"{UAEPASS_BASE}/idshub/token",
                data={
                    "grant_type":    "client_credentials",
                    "client_id":     client_id,
                    "client_secret": client_secret,
                    "scope":         "urn:uae:digitalid:profile",
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json()["access_token"]

            # Step 2: fetch profile
            profile_resp = await client.get(
                f"{UAEPASS_BASE}/idshub/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile_resp.raise_for_status()
            profile = profile_resp.json()

            # Verify the Emirates ID matches (security check)
            if profile.get("idn") != emirates_id:
                return None

            return profile

    except Exception:
        return None   # fail gracefully – caller falls back to local DB