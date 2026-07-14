from __future__ import annotations

from fastapi.testclient import TestClient


def login(client: TestClient, username: str, password: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_user(client: TestClient, headers: dict[str, str], username: str = "alice") -> dict:
    response = client.post(
        "/api/users",
        headers=headers,
        json={"username": username, "password": "alice@123", "role": "user"},
    )
    assert response.status_code == 201
    return response.json()


def test_every_user_gets_a_default_gallery_folder(test_app):
    with TestClient(test_app) as client:
        admin_headers = login(client, "admin", "admin@123")
        folders = client.get("/api/folders", headers=admin_headers)

    assert folders.status_code == 200
    assert any(folder["name"] == "图库" and folder["is_default"] for folder in folders.json())


def test_user_management_is_admin_only_and_returns_no_password(test_app):
    with TestClient(test_app) as client:
        admin_headers = login(client, "admin", "admin@123")
        user = create_user(client, admin_headers)
        user_headers = login(client, "alice", "alice@123")

        denied = client.get("/api/users", headers=user_headers)
        listed = client.get("/api/users", headers=admin_headers)
        updated = client.patch(
            f"/api/users/{user['id']}",
            headers=admin_headers,
            json={"is_active": False},
        )

    assert denied.status_code == 403
    assert listed.status_code == 200
    assert all("password" not in item and "password_hash" not in item for item in listed.json())
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False


def test_recent_photos_are_owner_scoped_but_admin_can_manage_all(test_app, image_bytes):
    with TestClient(test_app) as client:
        admin_headers = login(client, "admin", "admin@123")
        create_user(client, admin_headers)
        user_headers = login(client, "alice", "alice@123")

        admin_upload = client.post(
            "/api/photos/upload",
            headers=admin_headers,
            files={"file": ("admin.png", image_bytes, "image/png")},
        )
        user_upload = client.post(
            "/api/photos/upload",
            headers=user_headers,
            files={"file": ("alice.png", image_bytes, "image/png")},
        )
        user_recent = client.get("/api/photos?page_size=24", headers=user_headers)
        admin_all = client.get("/api/photos?scope=all&page_size=24", headers=admin_headers)

    assert admin_upload.status_code == 201
    assert user_upload.status_code == 201
    assert user_recent.status_code == 200
    assert [item["original_name"] for item in user_recent.json()["items"]] == ["alice.png"]
    assert admin_all.status_code == 200
    assert {item["original_name"] for item in admin_all.json()["items"]} == {"admin.png", "alice.png"}


def test_folder_crud_and_photo_move_and_rename_are_owner_scoped(test_app, image_bytes):
    with TestClient(test_app) as client:
        admin_headers = login(client, "admin", "admin@123")
        create_user(client, admin_headers)
        user_headers = login(client, "alice", "alice@123")

        created_folder = client.post("/api/folders", headers=user_headers, json={"name": "Travel"})
        uploaded = client.post(
            "/api/photos/upload",
            headers=user_headers,
            files={"file": ("before.png", image_bytes, "image/png")},
        )
        photo = uploaded.json()
        renamed = client.patch(
            f"/api/photos/{photo['id']}/name",
            headers=user_headers,
            json={"name": "after.png"},
        )
        moved = client.patch(
            f"/api/photos/{photo['id']}/folder",
            headers=user_headers,
            json={"folder_id": created_folder.json()["id"]},
        )
        blocked_delete = client.delete(
            f"/api/folders/{created_folder.json()['id']}",
            headers=user_headers,
        )
        folders = client.get("/api/folders", headers=user_headers)

    assert created_folder.status_code == 201
    assert renamed.status_code == 200
    assert renamed.json()["original_name"] == "after.png"
    assert moved.status_code == 200
    assert moved.json()["folder_id"] == created_folder.json()["id"]
    assert blocked_delete.status_code == 409
    assert any(folder["name"] == "Travel" for folder in folders.json())
