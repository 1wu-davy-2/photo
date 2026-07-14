from __future__ import annotations

from io import BytesIO

from minio import Minio
from minio.commonconfig import CopySource
from minio.error import S3Error

from .config import Settings


class MinioStorage:
    def __init__(self, settings: Settings):
        self.bucket = settings.minio_bucket
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def put_object(self, object_key: str, payload: bytes, content_type: str) -> None:
        self.client.put_object(
            self.bucket,
            object_key,
            BytesIO(payload),
            length=len(payload),
            content_type=content_type,
        )

    def get_object(self, object_key: str):
        return self.client.get_object(self.bucket, object_key)

    def remove_object(self, object_key: str) -> None:
        try:
            self.client.remove_object(self.bucket, object_key)
        except S3Error as error:
            if error.code not in {"NoSuchKey", "NoSuchBucket"}:
                raise

    def move_object(self, object_key: str, new_object_key: str) -> None:
        if object_key == new_object_key:
            return
        self.client.copy_object(self.bucket, new_object_key, CopySource(self.bucket, object_key))
        self.remove_object(object_key)
