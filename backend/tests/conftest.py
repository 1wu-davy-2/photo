from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.auth import hash_password
from backend.app.config import Settings
from backend.app.db import Base
from backend.app.main import create_app


class MemoryObject:
    def __init__(self, payload: bytes):
        self._stream = BytesIO(payload)

    def read(self, size: int = -1):
        return self._stream.read(size)

    def close(self):
        self._stream.close()


class MemoryStorage:
    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def ensure_bucket(self):
        return None

    def put_object(self, object_key: str, payload: bytes, content_type: str):
        self.objects[object_key] = payload

    def get_object(self, object_key: str):
        if object_key not in self.objects:
            raise KeyError(object_key)
        return MemoryObject(self.objects[object_key])

    def remove_object(self, object_key: str):
        self.objects.pop(object_key, None)

    def move_object(self, object_key: str, new_object_key: str):
        if object_key not in self.objects:
            raise KeyError(object_key)
        self.objects[new_object_key] = self.objects.pop(object_key)


@pytest.fixture
def image_bytes() -> bytes:
    image = Image.new("RGB", (640, 420), (28, 91, 81))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def test_app(tmp_path: Path):
    database_path = tmp_path / "photos.sqlite3"
    engine = create_engine(f"sqlite:///{database_path}", connect_args={"check_same_thread": False})
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    storage = MemoryStorage()
    settings = Settings(
        database_url=f"sqlite:///{database_path}",
        minio_endpoint="memory:9000",
        minio_access_key="access",
        minio_secret_key="secret",
        minio_bucket="photos",
        max_upload_size_mb=1,
        auth_secret_key="test-secret-key",
        auth_token_ttl_minutes=60,
        admin_username="admin",
        admin_password_hash=hash_password("admin@123"),
    )
    return create_app(settings=settings, session_factory=session_factory, storage=storage)
