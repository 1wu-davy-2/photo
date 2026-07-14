from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.auth import router as auth_router
from .api.folders import router as folders_router
from .api.photos import router as photos_router
from .api.users import router as users_router
from .auth import AuthService
from .config import Settings
from .db import Base, create_session_factory
from .models import User
from .storage import MinioStorage
from .services.folders import FolderService


def create_app(*, settings: Settings | None = None, session_factory=None, storage=None) -> FastAPI:
    app_settings = settings or Settings()
    app_settings.validate_production_security()
    engine = None
    if session_factory is None:
        engine, session_factory = create_session_factory(app_settings.database_url)

    app_storage = storage or MinioStorage(app_settings)
    auth_service = AuthService(app_settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if engine is not None:
            Base.metadata.create_all(engine)
        with session_factory() as session:
            default_user = auth_service.ensure_default_user(session)
            folder_service = FolderService(session)
            folder_service.ensure_default_folder(default_user.id)
            for user in session.query(User).all():
                folder_service.ensure_default_folder(user.id)
        app_storage.ensure_bucket()
        yield

    app = FastAPI(title="Lumen Archive API", version="0.1.0", lifespan=lifespan)
    app.state.settings = app_settings
    app.state.session_factory = session_factory
    app.state.storage = app_storage
    app.state.auth_service = auth_service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if app_settings.cors_allow_all else list(app_settings.cors_origins),
        allow_credentials=not app_settings.cors_allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "lumen-archive-api"}

    app.include_router(auth_router, prefix="/api")
    app.include_router(users_router, prefix="/api")
    app.include_router(folders_router, prefix="/api")
    app.include_router(photos_router, prefix="/api")
    return app


app = create_app()
