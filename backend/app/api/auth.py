from __future__ import annotations

import time
from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..auth import AuthenticatedUser, require_current_user
from ..schemas import AuthUserRead, LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, session: Session = Depends(get_session)):
    auth_service = request.app.state.auth_service
    user = auth_service.authenticate(session, payload.username, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires_in = auth_service.settings.auth_token_ttl_minutes * 60
    token = auth_service.create_access_token(user.username, ttl_seconds=expires_in)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        expires_at=int(time.time()) + expires_in,
        user=AuthUserRead(username=user.username, role=user.role),
    )


@router.get("/me", response_model=AuthUserRead)
def me(user: AuthenticatedUser = Depends(require_current_user)):
    return AuthUserRead(username=user.username, role=user.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_: AuthenticatedUser = Depends(require_current_user)):
    return Response(status_code=status.HTTP_204_NO_CONTENT)
