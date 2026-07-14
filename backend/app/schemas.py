from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_name: str
    mime_type: str
    size_bytes: int
    width: int
    height: int
    owner_id: str | None = None
    folder_id: str | None = None
    created_at: datetime
    updated_at: datetime

    @property
    def aspect_ratio(self) -> float:
        return self.width / self.height if self.height else 1.0


class PhotoListResponse(BaseModel):
    items: list[PhotoRead]
    total: int
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class AuthUserRead(BaseModel):
    username: str
    role: str


class UserRead(BaseModel):
    id: str | None = None
    username: str
    role: str
    is_active: bool = True
    created_at: datetime | None = None


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    role: str = Field(default="user", pattern="^(admin|user)$")


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=256)
    role: str | None = Field(default=None, pattern="^(admin|user)$")
    is_active: bool | None = None


class FolderRead(BaseModel):
    id: str
    owner_id: str
    parent_id: str | None = None
    name: str
    is_default: bool
    photo_count: int = 0


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: str | None = None
    owner_id: str | None = None


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class PhotoMoveRequest(BaseModel):
    folder_id: str


class PhotoRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class PhotoWallCreate(BaseModel):
    name: str = Field(default="Untitled wall", min_length=1, max_length=120)
    background_color: str = Field(default="#F6FAFF", min_length=4, max_length=32)


class PhotoWallUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    background_color: str | None = Field(default=None, min_length=4, max_length=32)


class PhotoWallItemInput(BaseModel):
    photo_id: str = Field(min_length=1, max_length=36)
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    width: float = Field(gt=5, le=100)
    rotation: float = Field(ge=-180, le=180)
    z_index: int = Field(ge=0, le=10000)


class PhotoWallLayoutUpdate(BaseModel):
    items: list[PhotoWallItemInput] = Field(default_factory=list, max_length=200)


class PhotoWallItemRead(BaseModel):
    id: str
    photo: PhotoRead
    x: float
    y: float
    width: float
    rotation: float
    z_index: int


class PhotoWallRead(BaseModel):
    id: str
    owner_id: str
    name: str
    background_color: str
    created_at: datetime
    updated_at: datetime
    items: list[PhotoWallItemRead] = Field(default_factory=list)


class PhotoWallShareRead(BaseModel):
    token: str
    path: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    expires_at: int
    user: AuthUserRead
