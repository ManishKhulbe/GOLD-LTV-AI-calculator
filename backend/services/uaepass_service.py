import os
from typing import Optional

# Hardcoded enrichment for the 3 seeded Emirates IDs
_UAEPASS_PROFILES = {
    "784-1985-1234567-1": {
        "name": "Ahmed Al-Mansoori",
        "nationality": "Emirati",
        "verified": True,
    },
    "784-1990-2345678-2": {
        "name": "Sara Mohammed Al-Rashidi",
        "nationality": "Emirati",
        "verified": True,
    },
    "784-1978-3456789-3": {
        "name": "Khalid Ibrahim Al-Zaabi",
        "nationality": "Emirati",
        "verified": True,
    },
}


async def enrich_from_uaepass(emirates_id: str) -> Optional[dict]:
    """Return UAE PASS profile dict or None — never raises."""
    try:
        return _UAEPASS_PROFILES.get(emirates_id)
    except Exception:
        return None
