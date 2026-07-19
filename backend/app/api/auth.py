from __future__ import annotations

import time
from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..auth import AuthenticatedUser, RefreshTokenConflict, RefreshTokenError, require_current_user
from ..schemas import AuthUserRead, LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def set_refresh_cookie(response: Response, auth_service, raw_token: str) -> None:
    max_age = auth_service.settings.auth_refresh_token_ttl_days * 24 * 60 * 60
    response.set_cookie(
        key=auth_service.settings.auth_refresh_cookie_name,
        value=raw_token,
        max_age=max_age,
        path="/api/auth",
        secure=auth_service.settings.auth_refresh_cookie_secure,
        httponly=True,
        samesite="lax",
    )


def clear_refresh_cookie(response: Response, auth_service) -> None:
    response.delete_cookie(
        key=auth_service.settings.auth_refresh_cookie_name,
        path="/api/auth",
        secure=auth_service.settings.auth_refresh_cookie_secure,
        httponly=True,
        samesite="lax",
    )


def token_response(auth_service, user) -> TokenResponse:
    expires_in = auth_service.settings.auth_token_ttl_minutes * 60
    return TokenResponse(
        access_token=auth_service.create_access_token(user.username, ttl_seconds=expires_in),
        token_type="bearer",
        expires_in=expires_in,
        expires_at=int(time.time()) + expires_in,
        user=AuthUserRead(username=user.username, role=user.role),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, session: Session = Depends(get_session)):
    auth_service = request.app.state.auth_service
    user = auth_service.authenticate(session, payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    auth_service.revoke_refresh_token(
        session,
        request.cookies.get(auth_service.settings.auth_refresh_cookie_name),
    )
    set_refresh_cookie(response, auth_service, auth_service.issue_refresh_token(session, user))
    return token_response(auth_service, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, session: Session = Depends(get_session)):
    auth_service = request.app.state.auth_service
    raw_token = request.cookies.get(auth_service.settings.auth_refresh_cookie_name)
    if not raw_token:
        clear_refresh_cookie(response, auth_service)
        cookie_header = response.headers.get("set-cookie", "")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
            headers={"Set-Cookie": cookie_header},
        )
    try:
        user, replacement = auth_service.rotate_refresh_token(session, raw_token)
    except RefreshTokenConflict as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error.detail,
            headers={"Retry-After": "1"},
        ) from error
    except RefreshTokenError as error:
        clear_refresh_cookie(response, auth_service)
        cookie_header = response.headers.get("set-cookie", "")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error.detail,
            headers={"Set-Cookie": cookie_header},
        ) from error
    set_refresh_cookie(response, auth_service, replacement)
    return token_response(auth_service, user)


@router.get("/me", response_model=AuthUserRead)
def me(user: AuthenticatedUser = Depends(require_current_user)):
    return AuthUserRead(username=user.username, role=user.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, session: Session = Depends(get_session)):
    auth_service = request.app.state.auth_service
    auth_service.revoke_refresh_token(
        session,
        request.cookies.get(auth_service.settings.auth_refresh_cookie_name),
    )
    clear_refresh_cookie(response, auth_service)
    response.status_code = status.HTTP_204_NO_CONTENT
