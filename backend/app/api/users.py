from __future__ import annotations

from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..auth import AuthenticatedUser, require_admin
from ..schemas import UserCreate, UserRead, UserUpdate
from ..services.users import UserConflictError, UserNotFoundError, UserService

router = APIRouter(prefix="/users", tags=["users"])


def get_session(request: Request) -> Generator[Session, None, None]:
    session = request.app.state.session_factory()
    try:
        yield session
    finally:
        session.close()


def to_read(user) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("", response_model=list[UserRead])
def list_users(_: AuthenticatedUser = Depends(require_admin), session: Session = Depends(get_session)):
    return [to_read(user) for user in UserService(session).list()]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: AuthenticatedUser = Depends(require_admin),
    session: Session = Depends(get_session),
):
    try:
        return to_read(UserService(session).create(username=payload.username, password=payload.password, role=payload.role))
    except UserConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: AuthenticatedUser = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if current_user.id == user_id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot disable the current account")
    try:
        return to_read(
            UserService(session).update(
                user_id,
                password=payload.password,
                role=payload.role,
                is_active=payload.is_active,
            )
        )
    except UserNotFoundError as error:
        raise HTTPException(status_code=404, detail="User not found") from error
    except UserConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    current_user: AuthenticatedUser = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete the current account")
    try:
        UserService(session).delete(user_id)
    except UserNotFoundError as error:
        raise HTTPException(status_code=404, detail="User not found") from error
    except UserConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
