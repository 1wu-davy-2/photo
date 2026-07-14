from __future__ import annotations

import hashlib
import mimetypes
import uuid
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import Settings
from ..models import Folder, Photo
from .folders import FolderNotFoundError, FolderService

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
}
FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
    "AVIF": "image/avif",
}


class PhotoValidationError(ValueError):
    pass


class PhotoNotFoundError(LookupError):
    pass


@dataclass(frozen=True)
class ImageMetadata:
    mime_type: str
    size_bytes: int
    width: int
    height: int
    checksum: str


def inspect_image(*, filename: str, content_type: str | None, payload: bytes, max_bytes: int) -> ImageMetadata:
    if not payload:
        raise PhotoValidationError("The uploaded file is empty")
    if len(payload) > max_bytes:
        raise PhotoValidationError("The uploaded file is too large")

    try:
        with Image.open(BytesIO(payload)) as image:
            image.verify()
        with Image.open(BytesIO(payload)) as image:
            image_format = (image.format or "").upper()
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise PhotoValidationError("Please upload a valid image file") from error

    mime_type = FORMAT_TO_MIME.get(image_format)
    if mime_type not in ALLOWED_MIME_TYPES:
        guessed_type = content_type or mimetypes.guess_type(filename)[0]
        if guessed_type not in ALLOWED_MIME_TYPES:
            raise PhotoValidationError("This image format is not supported")
        mime_type = guessed_type

    return ImageMetadata(
        mime_type=mime_type,
        size_bytes=len(payload),
        width=width,
        height=height,
        checksum=hashlib.sha256(payload).hexdigest(),
    )


class PhotoService:
    def __init__(self, session: Session, storage, settings: Settings):
        self.session = session
        self.storage = storage
        self.settings = settings

    @staticmethod
    def _safe_filename(filename: str) -> str:
        return (filename or "untitled-image").replace("\\", "/").split("/")[-1].strip()[:255] or "untitled-image"

    @staticmethod
    def _extension(filename: str) -> str:
        return (filename.rsplit(".", 1)[-1].lower() if "." in filename else "img")[:10]

    @staticmethod
    def _object_key(folder_id: str, photo_id: str, filename: str) -> str:
        return f"folders/{folder_id}/{photo_id}.{PhotoService._extension(filename)}"

    def upload(self, *, owner_id: str, filename: str, content_type: str | None, payload: bytes) -> Photo:
        safe_name = self._safe_filename(filename)
        metadata = inspect_image(
            filename=safe_name,
            content_type=content_type,
            payload=payload,
            max_bytes=self.settings.max_upload_size_bytes,
        )
        photo_id = str(uuid.uuid4())
        folder = self.session.scalar(
            select(Folder).where(Folder.owner_id == owner_id, Folder.is_default.is_(True))
        ) or FolderService(self.session).ensure_default_folder(owner_id)
        object_key = self._object_key(folder.id, photo_id, safe_name)
        photo = Photo(
            id=photo_id,
            object_key=object_key,
            original_name=safe_name[:255],
            mime_type=metadata.mime_type,
            size_bytes=metadata.size_bytes,
            width=metadata.width,
            height=metadata.height,
            checksum=metadata.checksum,
            owner_id=owner_id,
            folder_id=folder.id,
        )

        self.storage.put_object(object_key, payload, metadata.mime_type)
        try:
            self.session.add(photo)
            self.session.commit()
            self.session.refresh(photo)
        except Exception:
            self.session.rollback()
            self.storage.remove_object(object_key)
            raise
        return photo

    def list(
        self,
        *,
        search: str | None,
        sort: str,
        page: int,
        page_size: int,
        owner_id: str | None = None,
    ) -> tuple[list[Photo], int]:
        query = select(Photo)
        count_query = select(func.count(Photo.id))
        if owner_id is not None:
            query = query.where(Photo.owner_id == owner_id)
            count_query = count_query.where(Photo.owner_id == owner_id)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.where(Photo.original_name.ilike(pattern))
            count_query = count_query.where(Photo.original_name.ilike(pattern))
        query = query.order_by(Photo.created_at.asc() if sort == "oldest" else Photo.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        return list(self.session.scalars(query)), int(self.session.scalar(count_query) or 0)

    def get(self, photo_id: str, *, owner_id: str | None = None) -> Photo:
        photo = self.session.get(Photo, photo_id)
        if photo is None or owner_id is not None and photo.owner_id != owner_id:
            raise PhotoNotFoundError(photo_id)
        return photo

    def move(self, photo_id: str, *, folder_id: str, owner_id: str | None = None) -> Photo:
        photo = self.get(photo_id, owner_id=owner_id)
        target = self.session.get(Folder, folder_id)
        if target is None or owner_id is not None and target.owner_id != owner_id:
            raise FolderNotFoundError(folder_id)
        if photo.folder_id == target.id:
            return photo
        new_object_key = self._object_key(target.id, photo.id, photo.original_name)
        self.storage.move_object(photo.object_key, new_object_key)
        old_object_key = photo.object_key
        photo.folder_id = target.id
        photo.object_key = new_object_key
        try:
            self.session.commit()
        except Exception:
            self.session.rollback()
            self.storage.move_object(new_object_key, old_object_key)
            raise
        self.session.refresh(photo)
        return photo

    def rename(self, photo_id: str, *, name: str, owner_id: str | None = None) -> Photo:
        photo = self.get(photo_id, owner_id=owner_id)
        safe_name = self._safe_filename(name)
        if not safe_name:
            raise PhotoValidationError("A photo name is required")
        folder_id = photo.folder_id or "unfiled"
        new_object_key = self._object_key(folder_id, photo.id, safe_name)
        old_object_key = photo.object_key
        if old_object_key != new_object_key:
            self.storage.move_object(old_object_key, new_object_key)
        photo.original_name = safe_name
        photo.object_key = new_object_key
        try:
            self.session.commit()
        except Exception:
            self.session.rollback()
            if old_object_key != new_object_key:
                self.storage.move_object(new_object_key, old_object_key)
            raise
        self.session.refresh(photo)
        return photo

    def delete(self, photo_id: str, *, owner_id: str | None = None) -> None:
        photo = self.get(photo_id, owner_id=owner_id)
        self.storage.remove_object(photo.object_key)
        self.session.delete(photo)
        self.session.commit()
