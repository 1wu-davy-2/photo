import json
import os
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


PHOTO = {
    "id": "photo-1",
    "original_name": "morning-light.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 2048,
    "width": 1200,
    "height": 800,
    "created_at": "2026-07-14T08:00:00Z",
    "updated_at": "2026-07-14T08:00:00Z",
}

SVG = """<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'>
<rect width='1200' height='800' fill='#0e2c2b'/>
<circle cx='860' cy='260' r='180' fill='#ceff64'/>
<path d='M0 680L330 420L560 610L820 360L1200 690V800H0Z' fill='#62e4d7' opacity='.65'/>
<path d='M0 770L410 520L650 720L940 520L1200 740V800H0Z' fill='#ffc85a' opacity='.62'/>
</svg>"""


def main() -> None:
    output_dir = Path("output/playwright")
    output_dir.mkdir(parents=True, exist_ok=True)
    base_url = os.getenv("BASE_URL", "http://127.0.0.1:6222")

    console_errors: list[str] = []
    page_errors: list[str] = []
    failed_requests: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url}: {request.failure}"))

        def handle_route(route):
            if "/api/auth/login" in route.request.url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "access_token": "browser-test-token",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "expires_at": int(time.time()) + 3600,
                    "user": {"username": "admin", "role": "admin"},
                }))
            elif "/api/photos?" in route.request.url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"items": [PHOTO], "total": 1, "page": 1, "page_size": 48}))
            else:
                route.fulfill(status=200, content_type="image/svg+xml", body=SVG)

        api_pattern = re.compile(r"^https?://[^/]+/api/")
        page.route(api_pattern, handle_route)
        response = page.goto(f"{base_url}/", wait_until="networkidle")
        if failed_requests:
            raise AssertionError(failed_requests)
        if page_errors:
            raise AssertionError(page_errors)
        page.get_by_label("Username").fill("admin")
        page.get_by_label("Password").fill("admin@123")
        page.get_by_role("button", name="Enter archive").click()
        page.get_by_role("button", name="Open morning-light.jpg").wait_for()
        page.screenshot(path=str(output_dir / "gallery-desktop.png"), full_page=True)
        page.get_by_role("button", name="Open morning-light.jpg").click()
        page.get_by_role("dialog", name="morning-light.jpg").wait_for()
        page.wait_for_timeout(300)
        page.screenshot(path=str(output_dir / "lightbox-desktop.png"))
        assert not console_errors, console_errors

        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile.route(api_pattern, handle_route)
        mobile.goto(f"{base_url}/", wait_until="networkidle")
        mobile.get_by_label("Username").fill("admin")
        mobile.get_by_label("Password").fill("admin@123")
        mobile.get_by_role("button", name="Enter archive").click()
        mobile.get_by_role("button", name="Open morning-light.jpg").wait_for()
        mobile.screenshot(path=str(output_dir / "gallery-mobile.png"), full_page=True)
        mobile.get_by_role("button", name="Open morning-light.jpg").click()
        mobile.get_by_role("dialog", name="morning-light.jpg").wait_for()
        mobile.wait_for_timeout(300)
        mobile.screenshot(path=str(output_dir / "lightbox-mobile.png"))
        mobile.close()
        browser.close()

    print("playwright smoke: passed")


if __name__ == "__main__":
    main()
