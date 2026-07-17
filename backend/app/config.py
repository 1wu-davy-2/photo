from __future__ import annotations

import os
from dataclasses import dataclass, field


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://photo_user:change-me@127.0.0.1:3306/photo_gallery?charset=utf8mb4",
        )
    )
    minio_endpoint: str = field(default_factory=lambda: os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000"))
    minio_access_key: str = field(default_factory=lambda: os.getenv("MINIO_ACCESS_KEY", "minioadmin"))
    minio_secret_key: str = field(default_factory=lambda: os.getenv("MINIO_SECRET_KEY", "minioadmin"))
    minio_bucket: str = field(default_factory=lambda: os.getenv("MINIO_BUCKET", "photo-gallery"))
    minio_origin_bucket: str | None = field(default_factory=lambda: os.getenv("MINIO_ORIGIN_BUCKET") or None)
    minio_preview_bucket: str | None = field(default_factory=lambda: os.getenv("MINIO_PREVIEW_BUCKET") or None)
    minio_secure: bool = field(default_factory=lambda: _as_bool(os.getenv("MINIO_SECURE")))
    max_upload_size_mb: int = field(
        default_factory=lambda: max(1, int(os.getenv("MAX_UPLOAD_SIZE_MB", "25")))
    )
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",")
            if origin.strip()
        )
    )
    auth_secret_key: str = field(default_factory=lambda: os.getenv("AUTH_SECRET_KEY", "change-this-secret-key"))
    auth_token_ttl_minutes: int = field(
        default_factory=lambda: max(5, int(os.getenv("AUTH_TOKEN_TTL_MINUTES", "60")))
    )
    admin_username: str = field(default_factory=lambda: os.getenv("ADMIN_USERNAME", "admin"))
    admin_password: str = field(default_factory=lambda: os.getenv("ADMIN_PASSWORD", "admin@123"))
    admin_password_hash: str = field(default_factory=lambda: os.getenv("ADMIN_PASSWORD_HASH", ""))

    def __post_init__(self) -> None:
        origin_bucket = (self.minio_origin_bucket or self.minio_bucket).strip()
        preview_bucket = (self.minio_preview_bucket or f"{origin_bucket}-preview").strip()
        object.__setattr__(self, "minio_origin_bucket", origin_bucket)
        object.__setattr__(self, "minio_preview_bucket", preview_bucket)

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def cors_allow_all(self) -> bool:
        return any(origin in {"*", "0.0.0.0"} for origin in self.cors_origins)

    def validate_production_security(self) -> None:
        if self.app_env != "production":
            return
        if len(self.auth_secret_key) < 32 or self.auth_secret_key == "change-this-secret-key":
            raise RuntimeError("AUTH_SECRET_KEY must be a random value of at least 32 characters in production")
        if not self.admin_password_hash and self.admin_password == "admin@123":
            raise RuntimeError("Set ADMIN_PASSWORD_HASH or change ADMIN_PASSWORD before production startup")
