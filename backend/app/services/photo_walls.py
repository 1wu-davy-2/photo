from __future__ import annotations

import secrets
import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from ..models import Photo, PhotoWall, PhotoWallItem, PhotoWallShare
from .photos import PhotoNotFoundError


class PhotoWallNotFoundError(LookupError):
    pass


class PhotoWallValidationError(ValueError):
    pass


class PhotoWallService:
    def __init__(self, session: Session):
        self.session = session

    def list(self, *, owner_id: str) -> list[PhotoWall]:
        return list(self.session.scalars(select(PhotoWall).where(PhotoWall.owner_id == owner_id).order_by(PhotoWall.updated_at.desc())))

    def get(self, wall_id: str, *, owner_id: str | None = None) -> PhotoWall:
        wall = self.session.get(PhotoWall, wall_id)
        if wall is None or owner_id is not None and wall.owner_id != owner_id:
            raise PhotoWallNotFoundError(wall_id)
        return wall

    def items(self, wall_id: str) -> list[PhotoWallItem]:
        return list(self.session.scalars(select(PhotoWallItem).where(PhotoWallItem.wall_id == wall_id).order_by(PhotoWallItem.z_index.asc())))

    def create(self, *, owner_id: str, name: str, background_color: str) -> PhotoWall:
        wall = PhotoWall(id=str(uuid.uuid4()), owner_id=owner_id, name=name.strip(), background_color=background_color.strip())
        self.session.add(wall)
        self.session.commit()
        self.session.refresh(wall)
        return wall

    def update(self, wall_id: str, *, owner_id: str, name: str | None, background_color: str | None) -> PhotoWall:
        wall = self.get(wall_id, owner_id=owner_id)
        if name is not None:
            wall.name = name.strip()
        if background_color is not None:
            wall.background_color = background_color.strip()
        self.session.commit()
        self.session.refresh(wall)
        return wall

    def save_layout(self, wall_id: str, *, owner_id: str, items: list[dict]) -> PhotoWall:
        wall = self.get(wall_id, owner_id=owner_id)
        photo_ids = [item["photo_id"] for item in items]
        if len(photo_ids) != len(set(photo_ids)):
            raise PhotoWallValidationError("A photo can only appear once on a wall")
        photos = {photo.id: photo for photo in self.session.scalars(select(Photo).where(Photo.id.in_(photo_ids), Photo.owner_id == owner_id))}
        if len(photos) != len(photo_ids):
            raise PhotoNotFoundError("A wall item photo was not found")
        self.session.execute(delete(PhotoWallItem).where(PhotoWallItem.wall_id == wall.id))
        for item in items:
            self.session.add(PhotoWallItem(id=str(uuid.uuid4()), wall_id=wall.id, **item))
        self.session.commit()
        self.session.refresh(wall)
        return wall

    def create_share(self, wall_id: str, *, owner_id: str) -> PhotoWallShare:
        wall = self.get(wall_id, owner_id=owner_id)
        self.session.execute(update(PhotoWallShare).where(PhotoWallShare.wall_id == wall.id).values(is_active=False))
        share = PhotoWallShare(id=str(uuid.uuid4()), wall_id=wall.id, token=secrets.token_urlsafe(32), is_active=True)
        self.session.add(share)
        self.session.commit()
        self.session.refresh(share)
        return share

    def get_share(self, token: str) -> PhotoWallShare:
        share = self.session.scalar(select(PhotoWallShare).where(PhotoWallShare.token == token, PhotoWallShare.is_active.is_(True)))
        if share is None:
            raise PhotoWallNotFoundError(token)
        return share
