from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.models import User


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
