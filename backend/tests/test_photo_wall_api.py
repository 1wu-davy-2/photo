from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.models import PhotoWallItem


def login(client: TestClient, username: str = "admin", password: str = "admin@123") -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_photo_wall_layout_and_public_share(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = login(client)
        uploaded = client.post(
            "/api/photos/upload",
            headers=headers,
            files={"file": ("wall.png", image_bytes, "image/png")},
        )
        photo_id = uploaded.json()["id"]
        created = client.post("/api/photo-walls", headers=headers, json={"name": "Summer wall"})
        wall_id = created.json()["id"]
        layout = client.put(
            f"/api/photo-walls/{wall_id}/layout",
            headers=headers,
            json={"items": [{"photo_id": photo_id, "x": 18, "y": 24, "width": 28, "rotation": -4, "z_index": 2}]},
        )
        loaded = client.get(f"/api/photo-walls/{wall_id}", headers=headers)
        share = client.post(f"/api/photo-walls/{wall_id}/share", headers=headers)
        public = client.get(f"/api/photo-wall-shares/{share.json()['token']}")
        content = client.get(f"/api/photo-wall-shares/{share.json()['token']}/photos/{photo_id}/content")

    assert uploaded.status_code == 201
    assert created.status_code == 201
    assert layout.status_code == 200
    assert loaded.json()["items"][0]["x"] == 18
    assert share.status_code == 201
    assert public.status_code == 200
    assert public.json()["name"] == "Summer wall"
    assert public.json()["items"][0]["photo"]["id"] == photo_id
    assert content.status_code == 200
    assert content.content == image_bytes


def test_photo_wall_rejects_duplicate_photo_items(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = login(client)
        uploaded = client.post(
            "/api/photos/upload",
            headers=headers,
            files={"file": ("duplicate.png", image_bytes, "image/png")},
        )
        wall = client.post("/api/photo-walls", headers=headers, json={"name": "Duplicate wall"})
        response = client.put(
            f"/api/photo-walls/{wall.json()['id']}/layout",
            headers=headers,
            json={"items": [
                {"photo_id": uploaded.json()["id"], "x": 10, "y": 10, "width": 20, "rotation": 0, "z_index": 1},
                {"photo_id": uploaded.json()["id"], "x": 20, "y": 20, "width": 20, "rotation": 0, "z_index": 2},
            ]},
        )

    assert response.status_code == 400


def test_deleting_a_photo_cleans_up_wall_items(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = login(client)
        uploaded = client.post(
            "/api/photos/upload",
            headers=headers,
            files={"file": ("cleanup.png", image_bytes, "image/png")},
        )
        photo_id = uploaded.json()["id"]
        wall = client.post("/api/photo-walls", headers=headers, json={"name": "Cleanup wall"})
        layout = client.put(
            f"/api/photo-walls/{wall.json()['id']}/layout",
            headers=headers,
            json={"items": [{"photo_id": photo_id, "x": 10, "y": 10, "width": 20, "rotation": 0, "z_index": 1}]},
        )
        deleted = client.delete(f"/api/photos/{photo_id}", headers=headers)

    with test_app.state.session_factory() as session:
        remaining = session.scalar(select(PhotoWallItem).where(PhotoWallItem.photo_id == photo_id))

    assert layout.status_code == 200
    assert deleted.status_code == 204
    assert remaining is None


def test_photo_wall_is_owner_scoped_and_invalid_share_is_hidden(test_app, image_bytes):
    with TestClient(test_app) as client:
        admin_headers = login(client)
        user = client.post(
            "/api/users",
            headers=admin_headers,
            json={"username": "wall-user", "password": "wall-user@123", "role": "user"},
        ).json()
        user_headers = login(client, "wall-user", "wall-user@123")
        created = client.post("/api/photo-walls", headers=user_headers, json={"name": "Private wall"})
        denied = client.get(f"/api/photo-walls/{created.json()['id']}", headers=admin_headers)
        missing = client.get("/api/photo-wall-shares/not-a-real-token")

    assert user["username"] == "wall-user"
    assert created.status_code == 201
    assert denied.status_code == 404
    assert missing.status_code == 404
