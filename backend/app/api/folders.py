from __future__ import annotations

from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from ..auth import AuthenticatedUser, require_current_user
from ..schemas import FolderCreate, FolderRead, FolderUpdate
from ..services.folders import FolderConflictError, FolderNotFoundError, FolderService

router = APIRouter(prefix="/folders", tags=["folders"])


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def to_read(folder, photo_count: int) -> FolderRead:
    return FolderRead(
        id=folder.id,
        owner_id=folder.owner_id,
        parent_id=folder.parent_id,
        name=folder.name,
        is_default=folder.is_default,
        photo_count=photo_count,
    )


@router.get("", response_model=list[FolderRead])
def list_folders(
    scope: str = Query(default="owned", pattern="^(owned|all)$"),
    current_user: AuthenticatedUser = Depends(require_current_user),
    session: Session = Depends(get_session),
):
    if scope == "all" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator permission required")
    owner_id = None if scope == "all" else current_user.id
    return [to_read(folder, count) for folder, count in FolderService(session).list(owner_id=owner_id)]


@router.post("", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    current_user: AuthenticatedUser = Depends(require_current_user),
    session: Session = Depends(get_session),
):
    if payload.owner_id is not None and payload.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator permission required")
    owner_id = payload.owner_id or current_user.id
    try:
        folder = FolderService(session).create(owner_id=owner_id, name=payload.name, parent_id=payload.parent_id)
        return to_read(folder, 0)
    except FolderNotFoundError as error:
        raise HTTPException(status_code=404, detail="Parent folder not found") from error
    except FolderConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.patch("/{folder_id}", response_model=FolderRead)
def rename_folder(
    folder_id: str,
    payload: FolderUpdate,
    current_user: AuthenticatedUser = Depends(require_current_user),
    session: Session = Depends(get_session),
):
    owner_id = None if current_user.role == "admin" else current_user.id
    try:
        folder = FolderService(session).rename(folder_id, name=payload.name, owner_id=owner_id)
        count = next((count for item, count in FolderService(session).list(owner_id=owner_id) if item.id == folder.id), 0)
        return to_read(folder, count)
    except FolderNotFoundError as error:
        raise HTTPException(status_code=404, detail="Folder not found") from error
    except FolderConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: str,
    current_user: AuthenticatedUser = Depends(require_current_user),
    session: Session = Depends(get_session),
):
    owner_id = None if current_user.role == "admin" else current_user.id
    try:
        FolderService(session).delete(folder_id, owner_id=owner_id)
    except FolderNotFoundError as error:
        raise HTTPException(status_code=404, detail="Folder not found") from error
    except FolderConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

