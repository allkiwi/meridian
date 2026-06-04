from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut
from services.auth_service import (
    authenticate,
    create_user,
    generate_tokens,
    get_current_user,
    get_or_create_google_user,
    refresh_access_token,
)
from services.oauth_service import build_google_auth_url, exchange_google_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await create_user(data, db)
    return generate_tokens(user.id)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate(data.email, data.password, db)
    return generate_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await refresh_access_token(data.refresh_token, db)


@router.get("/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.get("/google/login")
async def google_login():
    url, _state = await build_google_auth_url()
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    try:
        userinfo, token_data = await exchange_google_code(code=code, state=state)
        user = await get_or_create_google_user(
            google_id=userinfo["sub"],
            email=userinfo["email"],
            name=userinfo.get("name") or userinfo["email"],
            google_access_token=token_data["access_token"],
            google_refresh_token=token_data.get("refresh_token"),
            token_expiry=token_data.get("expiry"),
            scope=token_data.get("scope", ""),
            db=db,
        )
        tokens = generate_tokens(user.id)
        redirect_url = (
            f"{settings.frontend_url}/auth/callback"
            f"?access_token={tokens.access_token}"
            f"&refresh_token={tokens.refresh_token}"
        )
        return RedirectResponse(url=redirect_url, status_code=302)
    except Exception:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed", status_code=302)
