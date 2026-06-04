from fastapi import Request, Response
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from utils.tokens import decode_access_token

UNPROTECTED_PATHS = {
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/google/login",
    "/api/auth/google/callback",
    "/docs",
    "/openapi.json",
}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in UNPROTECTED_PATHS or request.url.path.startswith("/docs"):
            return await call_next(request)

        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization.removeprefix("Bearer ")
            try:
                user_id = decode_access_token(token)
                request.state.user_id = user_id
            except JWTError:
                request.state.user_id = None
        else:
            request.state.user_id = None

        return await call_next(request)
