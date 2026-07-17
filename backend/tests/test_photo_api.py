from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image


def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_photo_api_upload_list_preview_and_delete(test_app, image_bytes):
    with TestClient(test_app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        headers = auth_headers(client)

        uploaded = client.post(
            "/api/photos/upload",
            files={"file": ("sample.png", image_bytes, "image/png")},
            headers=headers,
        )
        assert uploaded.status_code == 201
        photo = uploaded.json()
        assert photo["width"] == 640
        assert photo["height"] == 420

        listing = client.get("/api/photos?search=sample&sort=newest", headers=headers)
        assert listing.status_code == 200
        assert listing.json()["total"] == 1

        storage = test_app.state.storage
        assert len(storage.origin_objects) == 1
        assert len(storage.preview_objects) == 2

        content = client.get(f"/api/photos/{photo['id']}/content", headers=headers)
        thumbnail = client.get(f"/api/photos/{photo['id']}/content?width=300", headers=headers)
        explicit_preview = client.get(f"/api/photos/{photo['id']}/content?width=1920", headers=headers)
        original = client.get(f"/api/photos/{photo['id']}/content?original=true", headers=headers)
        download = client.get(f"/api/photos/{photo['id']}/download", headers=headers)

        assert content.status_code == 200
        assert content.headers["content-type"].startswith("image/webp")
        assert "immutable" in content.headers["cache-control"]
        assert content.content == explicit_preview.content
        assert thumbnail.headers["content-type"].startswith("image/webp")
        with Image.open(BytesIO(thumbnail.content)) as image:
            assert max(image.size) <= 300
        assert original.headers["content-type"].startswith("image/png")
        assert original.content == image_bytes
        assert download.content == image_bytes
        assert "attachment" in download.headers["content-disposition"]

        deleted = client.delete(f"/api/photos/{photo['id']}", headers=headers)
        assert deleted.status_code == 204
        assert storage.origin_objects == {}
        assert storage.preview_objects == {}
        assert client.get(f"/api/photos/{photo['id']}/content", headers=headers).status_code == 404


def test_photo_api_rejects_missing_photo_content(test_app):
    with TestClient(test_app) as client:
        response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        response = client.get("/api/photos/not-found/content", headers=headers)

    assert response.status_code == 404


def test_photo_upload_can_target_a_selected_folder(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = auth_headers(client)
        folder = client.post("/api/folders", headers=headers, json={"name": "Trips"})
        uploaded = client.post(
            "/api/photos/upload",
            headers=headers,
            data={"folder_id": folder.json()["id"]},
            files={"file": ("trip.png", image_bytes, "image/png")},
        )

    assert folder.status_code == 201
    assert uploaded.status_code == 201
    assert uploaded.json()["folder_id"] == folder.json()["id"]


def test_photo_content_lazily_generates_missing_derivatives(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = auth_headers(client)
        uploaded = client.post(
            "/api/photos/upload",
            files={"file": ("legacy.png", image_bytes, "image/png")},
            headers=headers,
        )
        storage = test_app.state.storage
        storage.preview_objects.clear()

        response = client.get(
            f"/api/photos/{uploaded.json()['id']}/content?width=300",
            headers=headers,
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/webp")
    assert len(storage.preview_objects) == 2


def test_upload_storage_failure_cleans_up_partial_objects(test_app, image_bytes):
    storage = test_app.state.storage
    storage.fail_preview_put_at = 2

    with TestClient(test_app, raise_server_exceptions=False) as client:
        headers = auth_headers(client)
        response = client.post(
            "/api/photos/upload",
            files={"file": ("failed.png", image_bytes, "image/png")},
            headers=headers,
        )
        listing = client.get("/api/photos", headers=headers)

    assert response.status_code == 500
    assert listing.json()["total"] == 0
    assert storage.origin_objects == {}
    assert storage.preview_objects == {}


def test_photo_content_rejects_unknown_width(test_app, image_bytes):
    with TestClient(test_app) as client:
        headers = auth_headers(client)
        uploaded = client.post(
            "/api/photos/upload",
            files={"file": ("sized.png", image_bytes, "image/png")},
            headers=headers,
        )
        response = client.get(
            f"/api/photos/{uploaded.json()['id']}/content?width=640",
            headers=headers,
        )

    assert response.status_code == 422
