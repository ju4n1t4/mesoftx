from __future__ import annotations

import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen


class GoogleTokenError(Exception):
    pass


@dataclass(frozen=True)
class GoogleIdentity:
    email: str
    subject: str


def verify_google_id_token(id_token: str, expected_audience: str) -> GoogleIdentity:
    if not expected_audience or expected_audience.startswith("replace-with-"):
        raise GoogleTokenError("Google Client ID is not configured.")
    if not id_token:
        raise GoogleTokenError("Google ID token is required.")

    query = urlencode({"id_token": id_token})
    url = f"https://oauth2.googleapis.com/tokeninfo?{query}"

    try:
        with urlopen(url, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GoogleTokenError("Google ID token could not be verified.") from exc

    if payload.get("aud") != expected_audience:
        raise GoogleTokenError("Google ID token audience is invalid.")
    if payload.get("email_verified") not in (True, "true", "True"):
        raise GoogleTokenError("Google email is not verified.")

    email = str(payload.get("email", "")).strip().lower()
    subject = str(payload.get("sub", "")).strip()
    if not email or not subject:
        raise GoogleTokenError("Google ID token is missing required claims.")

    return GoogleIdentity(email=email, subject=subject)
