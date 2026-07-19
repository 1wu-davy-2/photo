from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import Settings
from .models import RefreshToken, User

PBKDF2_ITERATIONS = 310_000
REFRESH_ROTATION_GRACE_SECONDS = 5
bearer_scheme = HTTPBearer(auto_error=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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


class RefreshTokenError(Exception):
    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class RefreshTokenConflict(RefreshTokenError):
    pass


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
        payload = {
            "sub": username,
            "role": "admin",
            "iat": now,
            "exp": now + expires_in,
            "jti": str(uuid4()),
        }
        return jwt.encode(payload, self.settings.auth_secret_key, algorithm="HS256")

    @staticmethod
    def hash_refresh_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _new_refresh_token(self, user_id: str, now: datetime) -> tuple[str, RefreshToken]:
        raw_token = secrets.token_urlsafe(32)
        stored = RefreshToken(
            id=str(uuid4()),
            user_id=user_id,
            token_hash=self.hash_refresh_token(raw_token),
            created_at=now,
            expires_at=now + timedelta(days=self.settings.auth_refresh_token_ttl_days),
        )
        return raw_token, stored

    def _cleanup_refresh_tokens(self, session: Session, now: datetime, exclude_id: str | None = None) -> None:
        retention_cutoff = now - timedelta(days=self.settings.auth_refresh_token_ttl_days)
        statement = delete(RefreshToken).where(RefreshToken.expires_at < retention_cutoff)
        if exclude_id is not None:
            statement = statement.where(RefreshToken.id != exclude_id)
        session.execute(statement)

    def issue_refresh_token(self, session: Session, user: User) -> str:
        now = utcnow()
        self._cleanup_refresh_tokens(session, now)
        raw_token, stored = self._new_refresh_token(user.id, now)
        session.add(stored)
        session.commit()
        return raw_token

    def rotate_refresh_token(self, session: Session, raw_token: str) -> tuple[User, str]:
        now = utcnow()
        token_hash = self.hash_refresh_token(raw_token)
        stored = session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
        )
        if stored is None:
            session.rollback()
            raise RefreshTokenError("Invalid refresh token")
        if stored.revoked_at is not None:
            rotation_age = (now - stored.revoked_at).total_seconds()
            if stored.replaced_by_id and rotation_age <= REFRESH_ROTATION_GRACE_SECONDS:
                session.rollback()
                raise RefreshTokenConflict("Refresh already rotated")
            replacement_id = stored.replaced_by_id
            visited: set[str] = set()
            while replacement_id and replacement_id not in visited:
                visited.add(replacement_id)
                replacement = session.scalar(
                    select(RefreshToken).where(RefreshToken.id == replacement_id).with_for_update()
                )
                if replacement is None:
                    break
                if replacement.revoked_at is None:
                    replacement.revoked_at = now
                replacement_id = replacement.replaced_by_id
            session.commit()
            raise RefreshTokenError("Invalid refresh token")
        if stored.expires_at <= now:
            stored.revoked_at = now
            session.commit()
            raise RefreshTokenError("Refresh token expired")

        user = session.scalar(select(User).where(User.id == stored.user_id))
        if user is None or not user.is_active:
            stored.revoked_at = now
            session.commit()
            raise RefreshTokenError("User disabled or not found")

        self._cleanup_refresh_tokens(session, now, exclude_id=stored.id)
        replacement_raw, replacement = self._new_refresh_token(user.id, now)
        session.add(replacement)
        session.flush()
        stored.revoked_at = now
        stored.replaced_by_id = replacement.id
        session.commit()
        return user, replacement_raw

    def revoke_refresh_token(self, session: Session, raw_token: str | None) -> None:
        if not raw_token:
            return
        stored = session.scalar(
            select(RefreshToken)
            .where(RefreshToken.token_hash == self.hash_refresh_token(raw_token))
            .with_for_update()
        )
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = utcnow()
            session.commit()
        else:
            session.rollback()

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
