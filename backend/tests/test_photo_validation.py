from io import BytesIO

import pytest

from backend.app.services.photos import PhotoValidationError, inspect_image


def test_inspect_image_returns_dimensions_and_normalized_type(image_bytes):
    metadata = inspect_image(
        filename="holiday-photo.png",
        content_type="image/png",
        payload=image_bytes,
        max_bytes=1024 * 1024,
    )

    assert metadata.width == 640
    assert metadata.height == 420
    assert metadata.mime_type == "image/png"
    assert metadata.size_bytes == len(image_bytes)
    assert len(metadata.checksum) == 64


def test_inspect_image_rejects_non_image_payload():
    with pytest.raises(PhotoValidationError, match="valid image"):
        inspect_image(
            filename="notes.txt",
            content_type="text/plain",
            payload=b"not an image",
            max_bytes=1024,
        )


def test_inspect_image_rejects_files_larger_than_limit(image_bytes):
    with pytest.raises(PhotoValidationError, match="too large"):
        inspect_image(
            filename="large.png",
            content_type="image/png",
            payload=image_bytes,
            max_bytes=16,
        )
