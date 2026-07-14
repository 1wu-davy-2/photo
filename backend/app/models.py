from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_username", "username"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, server_default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = (
        UniqueConstraint("owner_id", "parent_id", "name", name="uq_folders_owner_parent_name"),
        Index("ix_folders_owner_id", "owner_id"),
        Index("ix_folders_parent_id", "parent_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(36), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Photo(Base):
    __tablename__ = "photos"
    __table_args__ = (
        Index("ix_photos_created_at", "created_at"),
        Index("ix_photos_original_name", "original_name"),
        Index("ix_photos_checksum", "checksum"),
        Index("ix_photos_owner_id", "owner_id"),
        Index("ix_photos_folder_id", "folder_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    object_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    folder_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PhotoWall(Base):
    __tablename__ = "photo_walls"
    __table_args__ = (Index("ix_photo_walls_owner_id", "owner_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(36), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    background_color: Mapped[str] = mapped_column(String(32), nullable=False, server_default="#F6FAFF")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PhotoWallItem(Base):
    __tablename__ = "photo_wall_items"
    __table_args__ = (
        UniqueConstraint("wall_id", "photo_id", name="uq_photo_wall_items_wall_photo"),
        Index("ix_photo_wall_items_wall_id", "wall_id"),
        Index("ix_photo_wall_items_photo_id", "photo_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wall_id: Mapped[str] = mapped_column(String(36), nullable=False)
    photo_id: Mapped[str] = mapped_column(String(36), nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False, default=10)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=10)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=24)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=18)
    rotation: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    z_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class PhotoWallShare(Base):
    __tablename__ = "photo_wall_shares"
    __table_args__ = (
        Index("ix_photo_wall_shares_wall_id", "wall_id"),
        Index("ix_photo_wall_shares_token", "token"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    wall_id: Mapped[str] = mapped_column(String(36), nullable=False)
    token: Mapped[str] = mapped_column(String(96), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
