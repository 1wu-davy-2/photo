import hashlib
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.models import RefreshToken, User


def test_default_admin_is_seeded_in_users_table(test_app):
    with TestClient(test_app) as client:
        session = client.app.state.session_factory()
        user = session.scalar(select(User).where(User.username == "admin"))
        session.close()

    assert user is not None
    assert user.role == "admin"
    assert user.is_active is True
    assert user.password_hash.startswith("pbkdf2_sha256$")


def test_disabled_database_user_cannot_login(test_app):
    with TestClient(test_app) as client:
        session = client.app.state.session_factory()
        user = session.scalar(select(User).where(User.username == "admin"))
        user.is_active = False
        session.commit()
        session.close()

        response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})

    assert response.status_code == 401


def test_photo_routes_require_a_bearer_token(test_app):
    with TestClient(test_app) as client:
        response = client.get("/api/photos")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_login_returns_one_hour_token_and_me_endpoint(test_app):
    with TestClient(test_app) as client:
        response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["token_type"] == "bearer"
        assert payload["expires_in"] == 3600
        assert payload["user"]["username"] == "admin"

        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {payload['access_token']}"})

    assert me.status_code == 200
    assert me.json() == {"username": "admin", "role": "admin"}


def test_login_sets_hashed_http_only_refresh_cookie(test_app):
    with TestClient(test_app) as client:
        response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        raw_token = response.cookies["lumen_refresh_token"]
        session = client.app.state.session_factory()
        stored = session.scalar(select(RefreshToken))
        session.close()

    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    assert "Path=/api/auth" in response.headers["set-cookie"]
    assert stored is not None
    assert stored.token_hash == hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    assert stored.token_hash != raw_token
    assert timedelta(days=6, hours=23) < stored.expires_at - stored.created_at <= timedelta(days=7)


def test_login_revokes_the_existing_browser_refresh_token(test_app):
    with TestClient(test_app) as client:
        first = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        old_cookie = first.cookies["lumen_refresh_token"]

        second = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})

        session = client.app.state.session_factory()
        old_stored = session.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hashlib.sha256(old_cookie.encode("utf-8")).hexdigest()
            )
        )
        session.close()

    assert second.status_code == 200
    assert old_stored.revoked_at is not None


def test_login_cleans_refresh_tokens_past_the_replay_retention_window(test_app):
    with TestClient(test_app) as client:
        login = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        old_cookie = login.cookies["lumen_refresh_token"]
        old_hash = hashlib.sha256(old_cookie.encode("utf-8")).hexdigest()
        session = client.app.state.session_factory()
        stored = session.scalar(select(RefreshToken).where(RefreshToken.token_hash == old_hash))
        stored.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=8)
        session.commit()
        session.close()

        client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})

        session = client.app.state.session_factory()
        removed = session.scalar(select(RefreshToken).where(RefreshToken.token_hash == old_hash))
        session.close()

    assert removed is None


def test_refresh_rotates_cookie_and_rejects_replay(test_app):
    with TestClient(test_app) as client:
        login = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        old_cookie = login.cookies["lumen_refresh_token"]
        old_access_token = login.json()["access_token"]

        refreshed = client.post("/api/auth/refresh")
        new_cookie = refreshed.cookies["lumen_refresh_token"]

        client.cookies.clear()
        concurrent_replay = client.post(
            "/api/auth/refresh",
            headers={"Cookie": f"lumen_refresh_token={old_cookie}"},
        )

        client.cookies.clear()
        follow_up = client.post(
            "/api/auth/refresh",
            headers={"Cookie": f"lumen_refresh_token={new_cookie}"},
        )

        session = client.app.state.session_factory()
        old_stored = session.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hashlib.sha256(old_cookie.encode("utf-8")).hexdigest()
            )
        )
        old_stored.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=10)
        session.commit()
        session.close()

        client.cookies.clear()
        replay = client.post(
            "/api/auth/refresh",
            headers={"Cookie": f"lumen_refresh_token={old_cookie}"},
        )

        session = client.app.state.session_factory()
        tokens = session.scalars(select(RefreshToken).order_by(RefreshToken.created_at)).all()
        session.close()

    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"] != old_access_token
    assert new_cookie != old_cookie
    assert concurrent_replay.status_code == 409
    assert "set-cookie" not in concurrent_replay.headers
    assert follow_up.status_code == 200
    assert len(tokens) == 3
    assert tokens[0].revoked_at is not None
    assert tokens[0].replaced_by_id == tokens[1].id
    assert replay.status_code == 401
    assert replay.json()["detail"] == "Invalid refresh token"
    assert all(token.revoked_at is not None for token in tokens)


def test_expired_refresh_token_is_rejected_and_cookie_is_cleared(test_app):
    with TestClient(test_app) as client:
        client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        session = client.app.state.session_factory()
        token = session.scalar(select(RefreshToken))
        token.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
        session.commit()
        session.close()

        response = client.post("/api/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token expired"
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_disabled_user_cannot_refresh(test_app):
    with TestClient(test_app) as client:
        client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        session = client.app.state.session_factory()
        user = session.scalar(select(User).where(User.username == "admin"))
        user.is_active = False
        session.commit()
        session.close()

        response = client.post("/api/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "User disabled or not found"


def test_logout_revokes_refresh_token_without_access_token(test_app):
    with TestClient(test_app) as client:
        client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        response = client.post("/api/auth/logout")

        session = client.app.state.session_factory()
        stored = session.scalar(select(RefreshToken))
        session.close()

    assert response.status_code == 204
    assert stored is not None
    assert stored.revoked_at is not None
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_login_rejects_wrong_password(test_app):
    with TestClient(test_app) as client:
        response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_expired_token_is_rejected(test_app):
    with TestClient(test_app) as client:
        token = client.app.state.auth_service.create_access_token("admin", ttl_seconds=-1)
        response = client.get("/api/photos", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"
