from __future__ import annotations

from collections.abc import Iterator
from functools import partial
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from ..auth import AuthenticatedUser, require_current_user
from ..models import Photo
from ..schemas import PhotoListResponse, PhotoMoveRequest, PhotoRead, PhotoRenameRequest
from ..services.folders import FolderNotFoundError
from ..services.photos import PhotoContent, PhotoNotFoundError, PhotoService, PhotoValidationError

router = APIRouter(prefix="/photos", tags=["photos"], dependencies=[Depends(require_current_user)])


async def _read_upload_with_limit(file: UploadFile, *, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while total <= max_bytes:
        chunk = await file.read(min(1024 * 1024, max_bytes - total + 1))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise PhotoValidationError("The uploaded file is too large")
        chunks.append(chunk)
    return b"".join(chunks)


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def get_service(request: Request, session: Session = Depends(get_session)) -> PhotoService:
    return PhotoService(session, request.app.state.storage, request.app.state.settings)


def _stream_object(object_response) -> Iterator[bytes]:
    try:
        while chunk := object_response.read(1024 * 1024):
            yield chunk
    finally:
        object_response.close()
        release_conn = getattr(object_response, "release_conn", None)
        if release_conn:
            release_conn()


def _photo_response(photo: Photo) -> PhotoRead:
    return PhotoRead.model_validate(photo)


@router.get("", response_model=PhotoListResponse)
def list_photos(
    service: PhotoService = Depends(get_service),
    search: str | None = Query(default=None, max_length=100),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    scope: str = Query(default="owned", pattern="^(owned|all)$"),
    current_user: AuthenticatedUser = Depends(require_current_user),
):
    if scope == "all" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator permission required")
    owner_id = None if scope == "all" else current_user.id
    items, total = service.list(search=search, sort=sort, page=page, page_size=page_size, owner_id=owner_id)
    return PhotoListResponse(items=[_photo_response(item) for item in items], total=total, page=page, page_size=page_size)


@router.post("/upload", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    folder_id: str | None = Form(default=None),
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    try:
        payload = await _read_upload_with_limit(file, max_bytes=service.settings.max_upload_size_bytes)
        photo = await run_in_threadpool(
            partial(
                service.upload,
                owner_id=current_user.id,
                filename=file.filename or "untitled-image",
                content_type=file.content_type,
                payload=payload,
                folder_id=folder_id,
            )
        )
        return _photo_response(photo)
    except (PhotoValidationError, FolderNotFoundError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _content_response(photo: Photo, content: PhotoContent, *, download: bool):
    headers = {
        "Cache-Control": (
            "private, max-age=3600"
            if content.is_original
            else "private, max-age=31536000, immutable"
        )
    }
    if download:
        headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(photo.original_name)}"
    return StreamingResponse(
        _stream_object(content.object_response),
        media_type=content.media_type,
        headers=headers,
    )


@router.get("/{photo_id}/content")
def photo_content(
    photo_id: str,
    width: int = Query(default=1920),
    original: bool = Query(default=False),
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    if width not in {300, 1920}:
        raise HTTPException(status_code=422, detail="width must be 300 or 1920")
    try:
        photo = service.get(photo_id, owner_id=None if current_user.role == "admin" else current_user.id)
        content = service.open_content(photo, width=width, original=original)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error
    except Exception as error:
        raise HTTPException(status_code=404, detail="Photo content not found") from error
    return _content_response(photo, content, download=False)


@router.get("/{photo_id}/download")
def download_photo(
    photo_id: str,
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    try:
        photo = service.get(photo_id, owner_id=None if current_user.role == "admin" else current_user.id)
        content = service.open_content(photo, original=True)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error
    except Exception as error:
        raise HTTPException(status_code=404, detail="Photo content not found") from error
    return _content_response(photo, content, download=True)


@router.patch("/{photo_id}/folder", response_model=PhotoRead)
def move_photo(
    photo_id: str,
    payload: PhotoMoveRequest,
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    try:
        return _photo_response(
            service.move(
                photo_id,
                folder_id=payload.folder_id,
                owner_id=None if current_user.role == "admin" else current_user.id,
            )
        )
    except (PhotoNotFoundError, FolderNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Photo or folder not found") from error


@router.patch("/{photo_id}/name", response_model=PhotoRead)
def rename_photo(
    photo_id: str,
    payload: PhotoRenameRequest,
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    try:
        return _photo_response(
            service.rename(
                photo_id,
                name=payload.name,
                owner_id=None if current_user.role == "admin" else current_user.id,
            )
        )
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: str,
    scope: str = Query(default="owned", pattern="^(owned|all)$"),
    current_user: AuthenticatedUser = Depends(require_current_user),
    service: PhotoService = Depends(get_service),
):
    if scope == "all" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator permission required")
    try:
        service.delete(photo_id, owner_id=None if scope == "all" else current_user.id)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo not found") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
