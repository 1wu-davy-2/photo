from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import Folder, Photo

DEFAULT_FOLDER_NAME = "图库"


class FolderNotFoundError(LookupError):
    pass


class FolderConflictError(ValueError):
    pass


class FolderService:
    def __init__(self, session: Session):
        self.session = session

    def ensure_default_folder(self, owner_id: str) -> Folder:
        folder = self.session.scalar(
            select(Folder).where(Folder.owner_id == owner_id, Folder.is_default.is_(True))
        )
        if folder is not None:
            return folder
        folder = Folder(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            name=DEFAULT_FOLDER_NAME,
            is_default=True,
        )
        self.session.add(folder)
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            existing = self.session.scalar(
                select(Folder).where(Folder.owner_id == owner_id, Folder.is_default.is_(True))
            )
            if existing is None:
                raise
            return existing
        self.session.refresh(folder)
        return folder

    def list(self, *, owner_id: str | None = None) -> list[tuple[Folder, int]]:
        query = select(Folder).order_by(Folder.is_default.desc(), Folder.name.asc())
        if owner_id is not None:
            query = query.where(Folder.owner_id == owner_id)
        folders = list(self.session.scalars(query))
        counts = {
            folder_id: count
            for folder_id, count in self.session.execute(
                select(Photo.folder_id, func.count(Photo.id)).where(Photo.folder_id.is_not(None)).group_by(Photo.folder_id)
            ).all()
        }
        return [(folder, int(counts.get(folder.id, 0))) for folder in folders]

    def get(self, folder_id: str, *, owner_id: str | None = None) -> Folder:
        folder = self.session.get(Folder, folder_id)
        if folder is None or owner_id is not None and folder.owner_id != owner_id:
            raise FolderNotFoundError(folder_id)
        return folder

    def create(self, *, owner_id: str, name: str, parent_id: str | None = None) -> Folder:
        clean_name = name.strip()
        if not clean_name:
            raise FolderConflictError("Folder name is required")
        if parent_id is not None:
            self.get(parent_id, owner_id=owner_id)
        folder = Folder(id=str(uuid.uuid4()), owner_id=owner_id, parent_id=parent_id, name=clean_name[:120])
        self.session.add(folder)
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise FolderConflictError("A folder with this name already exists") from error
        self.session.refresh(folder)
        return folder

    def rename(self, folder_id: str, *, name: str, owner_id: str | None = None) -> Folder:
        folder = self.get(folder_id, owner_id=owner_id)
        clean_name = name.strip()
        if not clean_name:
            raise FolderConflictError("Folder name is required")
        folder.name = clean_name[:120]
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise FolderConflictError("A folder with this name already exists") from error
        self.session.refresh(folder)
        return folder

    def delete(self, folder_id: str, *, owner_id: str | None = None) -> None:
        folder = self.get(folder_id, owner_id=owner_id)
        if folder.is_default:
            raise FolderConflictError("The default folder cannot be deleted")
        has_children = self.session.scalar(select(Folder.id).where(Folder.parent_id == folder.id).limit(1))
        has_photos = self.session.scalar(select(Photo.id).where(Photo.folder_id == folder.id).limit(1))
        if has_children is not None or has_photos is not None:
            raise FolderConflictError("Move child folders and photos before deleting this folder")
        self.session.delete(folder)
        self.session.commit()
