from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings
from .models import User

PBKDF2_ITERATIONS = 310_000
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_value, digest_value = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    username: str
    role: str


class AuthService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def ensure_default_user(self, session: Session) -> User:
        user = session.scalar(select(User).where(User.username == self.settings.admin_username))
        if user is not None:
            return user
        user = User(
            id=str(uuid4()),
            username=self.settings.admin_username,
            password_hash=self.settings.admin_password_hash or hash_password(self.settings.admin_password),
            role="admin",
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    def authenticate(self, session: Session, username: str, password: str) -> User | None:
        user = session.scalar(select(User).where(User.username == username))
        if user is None or not user.is_active or not verify_password(password, user.password_hash):
            return None
        return user

    def create_access_token(self, username: str, ttl_seconds: int | None = None) -> str:
        now = int(time.time())
        expires_in = ttl_seconds if ttl_seconds is not None else self.settings.auth_token_ttl_minutes * 60
        payload = {"sub": username, "role": "admin", "iat": now, "exp": now + expires_in}
        return jwt.encode(payload, self.settings.auth_secret_key, algorithm="HS256")

    def current_user(self, session: Session, token: str) -> AuthenticatedUser:
        try:
            payload = jwt.decode(token, self.settings.auth_secret_key, algorithms=["HS256"])
        except ExpiredSignatureError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error
        except InvalidTokenError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error

        username = payload.get("sub")
        if not isinstance(username, str):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = session.scalar(select(User).where(User.username == username))
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User disabled or not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return AuthenticatedUser(id=user.id, username=user.username, role=user.role)


def require_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    session = request.app.state.session_factory()
    try:
        return request.app.state.auth_service.current_user(session, credentials.credentials)
    finally:
        session.close()


def require_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    user = require_current_user(request, credentials)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator permission required",
        )
    return user
