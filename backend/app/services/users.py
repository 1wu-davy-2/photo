from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..models import Folder, Photo, User
from .folders import FolderService


class UserNotFoundError(LookupError):
    pass


class UserConflictError(ValueError):
    pass


class UserService:
    def __init__(self, session: Session):
        self.session = session

    def list(self) -> list[User]:
        return list(self.session.scalars(select(User).order_by(User.username.asc())))

    def get(self, user_id: str) -> User:
        user = self.session.get(User, user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user

    def create(self, *, username: str, password: str, role: str) -> User:
        clean_username = username.strip()
        if not clean_username:
            raise UserConflictError("Username is required")
        user = User(
            id=str(uuid.uuid4()),
            username=clean_username,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        self.session.add(user)
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise UserConflictError("A user with this username already exists") from error
        self.session.refresh(user)
        FolderService(self.session).ensure_default_folder(user.id)
        return user

    def update(self, user_id: str, *, password: str | None, role: str | None, is_active: bool | None) -> User:
        user = self.get(user_id)
        removes_active_admin = user.role == "admin" and user.is_active and (role == "user" or is_active is False)
        if removes_active_admin:
            active_admins = self.session.scalar(
                select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))
            ) or 0
            if active_admins <= 1:
                raise UserConflictError("At least one active administrator is required")
        if password is not None:
            user.password_hash = hash_password(password)
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        self.session.commit()
        self.session.refresh(user)
        return user

    def delete(self, user_id: str) -> None:
        user = self.get(user_id)
        if user.role == "admin" and user.is_active:
            active_admins = self.session.scalar(
                select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))
            ) or 0
            if active_admins <= 1:
                raise UserConflictError("At least one active administrator is required")
        photo_count = self.session.scalar(select(func.count(Photo.id)).where(Photo.owner_id == user.id)) or 0
        folders = list(self.session.scalars(select(Folder).where(Folder.owner_id == user.id)))
        folder_count = len([folder for folder in folders if not folder.is_default])
        if photo_count or folder_count:
            raise UserConflictError("Move or delete the user's photos and folders first")
        for folder in folders:
            self.session.delete(folder)
        self.session.delete(user)
        self.session.commit()
