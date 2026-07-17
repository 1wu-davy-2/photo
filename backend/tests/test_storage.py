from __future__ import annotations

from io import BytesIO

from backend.app.config import Settings
from backend.app.storage import MinioStorage


class FakeMinio:
    def __init__(self, *args, **kwargs):
        self.existing_buckets = {"origin"}
        self.created_buckets: list[str] = []
        self.put_calls: list[tuple[str, str, bytes, str]] = []
        self.get_calls: list[tuple[str, str]] = []
        self.remove_calls: list[tuple[str, str]] = []

    def bucket_exists(self, bucket: str) -> bool:
        return bucket in self.existing_buckets

    def make_bucket(self, bucket: str) -> None:
        self.created_buckets.append(bucket)
        self.existing_buckets.add(bucket)

    def put_object(self, bucket: str, object_key: str, stream, *, length: int, content_type: str) -> None:
        self.put_calls.append((bucket, object_key, stream.read(length), content_type))

    def get_object(self, bucket: str, object_key: str):
        self.get_calls.append((bucket, object_key))
        return BytesIO(b"stored")

    def remove_object(self, bucket: str, object_key: str) -> None:
        self.remove_calls.append((bucket, object_key))


def test_settings_uses_legacy_bucket_as_origin_fallback():
    settings = Settings(
        minio_bucket="legacy",
        minio_origin_bucket=None,
        minio_preview_bucket=None,
    )

    assert settings.minio_origin_bucket == "legacy"
    assert settings.minio_preview_bucket == "legacy-preview"


def test_storage_routes_originals_and_derivatives_to_separate_buckets(monkeypatch):
    fake_client = FakeMinio()
    monkeypatch.setattr("backend.app.storage.Minio", lambda *args, **kwargs: fake_client)
    settings = Settings(
        minio_bucket="legacy",
        minio_origin_bucket="origin",
        minio_preview_bucket="preview",
    )
    storage = MinioStorage(settings)

    storage.ensure_buckets()
    storage.put_origin("original/key.png", b"origin-data", "image/png")
    storage.put_preview("derived/key.webp", b"preview-data", "image/webp")
    storage.get_origin("original/key.png")
    storage.get_preview("derived/key.webp")
    storage.remove_origin("original/key.png")
    storage.remove_preview("derived/key.webp")

    assert fake_client.created_buckets == ["preview"]
    assert fake_client.put_calls == [
        ("origin", "original/key.png", b"origin-data", "image/png"),
        ("preview", "derived/key.webp", b"preview-data", "image/webp"),
    ]
    assert fake_client.get_calls == [
        ("origin", "original/key.png"),
        ("preview", "derived/key.webp"),
    ]
    assert fake_client.remove_calls == [
        ("origin", "original/key.png"),
        ("preview", "derived/key.webp"),
    ]
