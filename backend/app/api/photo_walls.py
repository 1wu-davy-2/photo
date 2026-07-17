from __future__ import annotations

from collections.abc import Generator, Iterator
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..auth import AuthenticatedUser, require_current_user
from ..models import Photo, PhotoWall
from ..schemas import PhotoRead, PhotoWallCreate, PhotoWallItemRead, PhotoWallLayoutUpdate, PhotoWallRead, PhotoWallShareRead, PhotoWallUpdate
from ..services.photo_walls import PhotoWallNotFoundError, PhotoWallService, PhotoWallValidationError
from ..services.photos import PhotoNotFoundError, PhotoService

router = APIRouter(prefix="/photo-walls", tags=["photo-walls"])
public_router = APIRouter(prefix="/photo-wall-shares", tags=["photo-wall-shares"])


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def wall_read(wall: PhotoWall, service: PhotoWallService) -> PhotoWallRead:
    items: list[PhotoWallItemRead] = []
    for item in service.items(wall.id):
        photo = service.session.get(Photo, item.photo_id)
        if photo is not None:
            items.append(PhotoWallItemRead(id=item.id, photo=PhotoRead.model_validate(photo), x=item.x, y=item.y, width=item.width, height=item.height, rotation=item.rotation, z_index=item.z_index))
    return PhotoWallRead(id=wall.id, owner_id=wall.owner_id, name=wall.name, background_color=wall.background_color, created_at=wall.created_at, updated_at=wall.updated_at, items=items)


@router.get("", response_model=list[PhotoWallRead], dependencies=[Depends(require_current_user)])
def list_walls(current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    return [wall_read(wall, service) for wall in service.list(owner_id=current_user.id)]


@router.post("", response_model=PhotoWallRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_current_user)])
def create_wall(payload: PhotoWallCreate, current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    return wall_read(service.create(owner_id=current_user.id, name=payload.name, background_color=payload.background_color), service)


@router.get("/{wall_id}", response_model=PhotoWallRead, dependencies=[Depends(require_current_user)])
def get_wall(wall_id: str, current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    try:
        return wall_read(service.get(wall_id, owner_id=current_user.id), service)
    except PhotoWallNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo wall not found") from error


@router.patch("/{wall_id}", response_model=PhotoWallRead, dependencies=[Depends(require_current_user)])
def update_wall(wall_id: str, payload: PhotoWallUpdate, current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    try:
        wall = service.update(wall_id, owner_id=current_user.id, name=payload.name, background_color=payload.background_color)
        return wall_read(wall, service)
    except PhotoWallNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo wall not found") from error


@router.put("/{wall_id}/layout", response_model=PhotoWallRead, dependencies=[Depends(require_current_user)])
def update_layout(wall_id: str, payload: PhotoWallLayoutUpdate, current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    try:
        wall = service.save_layout(wall_id, owner_id=current_user.id, items=[item.model_dump() for item in payload.items], background_color=payload.background_color)
        return wall_read(wall, service)
    except PhotoWallValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except (PhotoWallNotFoundError, PhotoNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Photo wall or photo not found") from error


@router.post("/{wall_id}/share", response_model=PhotoWallShareRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_current_user)])
def create_share(wall_id: str, current_user: AuthenticatedUser = Depends(require_current_user), session: Session = Depends(get_session)):
    try:
        share = PhotoWallService(session).create_share(wall_id, owner_id=current_user.id)
        return PhotoWallShareRead(token=share.token, path=f"/#/share/walls/{share.token}", is_active=share.is_active)
    except PhotoWallNotFoundError as error:
        raise HTTPException(status_code=404, detail="Photo wall not found") from error


def _stream_object(object_response) -> Iterator[bytes]:
    try:
        while chunk := object_response.read(1024 * 1024):
            yield chunk
    finally:
        object_response.close()
        release_conn = getattr(object_response, "release_conn", None)
        if release_conn:
            release_conn()


@public_router.get("/{token}", response_model=PhotoWallRead)
def get_public_wall(token: str, request: Request, session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    try:
        share = service.get_share(token)
        return wall_read(service.get(share.wall_id), service)
    except PhotoWallNotFoundError as error:
        raise HTTPException(status_code=404, detail="Shared photo wall not found") from error


@public_router.get("/{token}/photos/{photo_id}/content")
def get_public_photo(token: str, photo_id: str, request: Request, session: Session = Depends(get_session)):
    service = PhotoWallService(session)
    try:
        share = service.get_share(token)
        wall = service.get(share.wall_id)
        item_ids = {item.photo_id for item in service.items(wall.id)}
        if photo_id not in item_ids:
            raise PhotoNotFoundError(photo_id)
        photo = session.get(Photo, photo_id)
        if photo is None:
            raise PhotoNotFoundError(photo_id)
        content = PhotoService(
            session,
            request.app.state.storage,
            request.app.state.settings,
        ).open_content(photo, width=1920)
    except (PhotoWallNotFoundError, PhotoNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Shared photo not found") from error
    except Exception as error:
        raise HTTPException(status_code=404, detail="Shared photo content not found") from error
    return StreamingResponse(
        _stream_object(content.object_response),
        media_type=content.media_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(photo.original_name)}",
        },
    )
