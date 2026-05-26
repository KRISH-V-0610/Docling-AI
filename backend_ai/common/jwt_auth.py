"""
Shared JWT verification for Python services (Phase 3).

Matches the Express signing in backend/controllers/authController.js:
    jwt.sign({ userId }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' })

  Algorithm: HS256
  Secret:    env var JWT_SECRET_KEY (must match the Express service)
  Header:    Authorization: Bearer <token>
  Payload:   {"userId": "<mongo _id>", "iat": ..., "exp": ...}

Two modes, controlled by REQUIRE_AUTH:
  REQUIRE_AUTH=true  → fail-closed; missing/invalid token returns 401.
  REQUIRE_AUTH=false → fail-open; anonymous requests pass through with
                       user=None. Use this during the rollout so dev
                       loops don't break.
"""

from __future__ import annotations

import json
import os
from typing import Iterable, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


def _require_auth() -> bool:
    return os.getenv("REQUIRE_AUTH", "false").strip().lower() in {"1", "true", "yes"}


def _secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if not secret and _require_auth():
        raise RuntimeError(
            "REQUIRE_AUTH=true but JWT_SECRET_KEY is unset. Refusing to start "
            "in fail-closed mode without a secret."
        )
    return secret


def _decode(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=["HS256"])


def verify_token(request: Request) -> Optional[dict]:
    """FastAPI dependency. Returns the decoded JWT payload, or None when
    REQUIRE_AUTH=false and no token was supplied. Raises 401 otherwise."""
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    require = _require_auth()

    if not header or not header.lower().startswith("bearer "):
        if require:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or malformed Authorization header",
            )
        return None

    token = header.split(" ", 1)[1].strip()
    try:
        return _decode(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        if require:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")
        return None


# Convenience alias to make the intent visible at the call site.
RequireAuth = Depends(verify_token)


# --------------------------------------------------------------------------
# ASGI middleware variant — apply once at the app level, skip whitelist
# paths (healthz, docs, openapi, etc.). Useful for apps where every route
# should be protected but we don't want to touch every router definition.
# --------------------------------------------------------------------------
DEFAULT_PUBLIC_PATHS = (
    "/",
    "/healthz",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, public_paths: Iterable[str] = DEFAULT_PUBLIC_PATHS):
        super().__init__(app)
        self._public = tuple(public_paths)

    async def dispatch(self, request: Request, call_next):
        # CORS preflight must always pass through unauthenticated.
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if any(path == p or path.startswith(p + "/") for p in self._public):
            return await call_next(request)

        require = _require_auth()
        header = request.headers.get("authorization") or request.headers.get("Authorization")

        if not header or not header.lower().startswith("bearer "):
            if require:
                return Response(
                    json.dumps({"error": "Missing or malformed Authorization header"}),
                    status_code=401,
                    media_type="application/json",
                )
            request.state.user = None
            return await call_next(request)

        token = header.split(" ", 1)[1].strip()
        try:
            request.state.user = _decode(token)
        except jwt.ExpiredSignatureError:
            return Response(
                json.dumps({"error": "Token expired"}),
                status_code=401,
                media_type="application/json",
            )
        except jwt.InvalidTokenError as exc:
            if require:
                return Response(
                    json.dumps({"error": f"Invalid token: {exc}"}),
                    status_code=401,
                    media_type="application/json",
                )
            request.state.user = None

        return await call_next(request)
