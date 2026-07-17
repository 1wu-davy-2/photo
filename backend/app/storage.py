from __future__ import annotations

from io import BytesIO

from minio import Minio
from minio.commonconfig import CopySource
from minio.error import S3Error

from .config import Settings


class MinioStorage:
    def __init__(self, settings: Settings):
        self.origin_bucket = settings.minio_origin_bucket or settings.minio_bucket
        self.preview_bucket = settings.minio_preview_bucket or f"{self.origin_bucket}-preview"
        self.bucket = self.origin_bucket
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def ensure_buckets(self) -> None:
        for bucket in dict.fromkeys((self.origin_bucket, self.preview_bucket)):
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)

    def ensure_bucket(self) -> None:
        self.ensure_buckets()

    def _put_object(self, bucket: str, object_key: str, payload: bytes, content_type: str) -> None:
        self.client.put_object(
            bucket,
            object_key,
            BytesIO(payload),
            length=len(payload),
            content_type=content_type,
        )

    def put_origin(self, object_key: str, payload: bytes, content_type: str) -> None:
        self._put_object(self.origin_bucket, object_key, payload, content_type)

    def put_preview(self, object_key: str, payload: bytes, content_type: str) -> None:
        self._put_object(self.preview_bucket, object_key, payload, content_type)

    def get_origin(self, object_key: str):
        return self.client.get_object(self.origin_bucket, object_key)

    def get_preview(self, object_key: str):
        return self.client.get_object(self.preview_bucket, object_key)

    def _remove_object(self, bucket: str, object_key: str) -> None:
        try:
            self.client.remove_object(bucket, object_key)
        except S3Error as error:
            if error.code not in {"NoSuchKey", "NoSuchBucket"}:
                raise

    def remove_origin(self, object_key: str) -> None:
        self._remove_object(self.origin_bucket, object_key)

    def remove_preview(self, object_key: str) -> None:
        self._remove_object(self.preview_bucket, object_key)

    def put_object(self, object_key: str, payload: bytes, content_type: str) -> None:
        self.put_origin(object_key, payload, content_type)

    def get_object(self, object_key: str):
        return self.get_origin(object_key)

    def remove_object(self, object_key: str) -> None:
        self.remove_origin(object_key)

    def move_object(self, object_key: str, new_object_key: str) -> None:
        if object_key == new_object_key:
            return
        self.client.copy_object(
            self.origin_bucket,
            new_object_key,
            CopySource(self.origin_bucket, object_key),
        )
        self.remove_origin(object_key)
