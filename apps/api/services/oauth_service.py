import secrets
from datetime import datetime, timedelta, timezone

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client

from config import settings

GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
GOOGLE_SCOPES = "openid email profile https://www.googleapis.com/auth/gmail.send"

# In-memory PKCE store: state -> (code_verifier, expiry)
# Replace values with Redis calls (settings.redis_url) for multi-worker deployments.
_pkce_store: dict[str, tuple[str, datetime]] = {}
_PKCE_TTL_SECONDS = 300


def _callback_uri() -> str:
    return settings.google_redirect_uri


def _purge_stale_pkce() -> None:
    now = datetime.now(timezone.utc)
    stale = [k for k, (_, exp) in _pkce_store.items() if now > exp]
    for k in stale:
        del _pkce_store[k]


async def _fetch_discovery() -> dict:
    async with httpx.AsyncClient() as http:
        resp = await http.get(GOOGLE_DISCOVERY_URL)
        resp.raise_for_status()
        return resp.json()


async def _build_auth_url(prompt: str) -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)

    _purge_stale_pkce()
    _pkce_store[state] = (code_verifier, datetime.now(timezone.utc) + timedelta(seconds=_PKCE_TTL_SECONDS))

    disc = await _fetch_discovery()

    client = AsyncOAuth2Client(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=_callback_uri(),
        scope=GOOGLE_SCOPES,
        code_challenge_method="S256",
    )
    url, _ = client.create_authorization_url(
        disc["authorization_endpoint"],
        state=state,
        code_verifier=code_verifier,
        access_type="offline",
        prompt=prompt,
    )
    return url, state


async def build_google_auth_url() -> tuple[str, str]:
    return await _build_auth_url("select_account")


async def build_google_reauth_url() -> tuple[str, str]:
    """Force consent screen so Google issues a new token with updated scopes."""
    return await _build_auth_url("consent")


async def exchange_google_code(code: str, state: str) -> tuple[dict, dict]:
    if state not in _pkce_store:
        raise ValueError("Unknown or expired OAuth state")
    code_verifier, expiry = _pkce_store.pop(state)
    if datetime.now(timezone.utc) > expiry:
        raise ValueError("OAuth state expired")

    disc = await _fetch_discovery()

    client = AsyncOAuth2Client(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=_callback_uri(),
        scope=GOOGLE_SCOPES,
        code_challenge_method="S256",
    )
    async with client:
        token = await client.fetch_token(
            disc["token_endpoint"],
            code=code,
            code_verifier=code_verifier,
        )
        userinfo_resp = await client.get(disc["userinfo_endpoint"])
        userinfo_resp.raise_for_status()

    userinfo = userinfo_resp.json()

    token_expiry: datetime | None = None
    if token.get("expires_at"):
        token_expiry = datetime.fromtimestamp(token["expires_at"], tz=timezone.utc)

    token_data = {
        "access_token": token["access_token"],
        "refresh_token": token.get("refresh_token"),
        "expiry": token_expiry,
        "scope": token.get("scope", GOOGLE_SCOPES),
    }
    return userinfo, token_data
