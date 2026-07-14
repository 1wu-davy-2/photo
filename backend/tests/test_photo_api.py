from fastapi.testclient import TestClient


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

        content = client.get(f"/api/photos/{photo['id']}/content", headers=headers)
        assert content.status_code == 200
        assert content.headers["content-type"].startswith("image/png")
        assert content.content == image_bytes

        deleted = client.delete(f"/api/photos/{photo['id']}", headers=headers)
        assert deleted.status_code == 204
        assert client.get(f"/api/photos/{photo['id']}/content", headers=headers).status_code == 404


def test_photo_api_rejects_missing_photo_content(test_app):
    with TestClient(test_app) as client:
        response = client.post("/api/auth/login", json={"username": "admin", "password": "admin@123"})
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        response = client.get("/api/photos/not-found/content", headers=headers)

    assert response.status_code == 404
