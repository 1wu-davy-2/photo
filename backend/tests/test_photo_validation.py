import asyncio
from io import BytesIO

import pytest
from PIL import Image

from backend.app.api.photos import _read_upload_with_limit
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


def test_inspect_image_rejects_a_mismatched_declared_mime_type():
    buffer = BytesIO()
    Image.new("RGB", (8, 8), (20, 40, 60)).save(buffer, format="TIFF")

    with pytest.raises(PhotoValidationError, match="supported"):
        inspect_image(
            filename="spoofed.png",
            content_type="image/png",
            payload=buffer.getvalue(),
            max_bytes=1024 * 1024,
        )


def test_upload_reader_stops_when_the_stream_exceeds_the_limit():
    class ChunkedUpload:
        def __init__(self):
            self.chunks = [b"1234", b"56"]
            self.read_sizes: list[int] = []

        async def read(self, size: int):
            self.read_sizes.append(size)
            return self.chunks.pop(0) if self.chunks else b""

    upload = ChunkedUpload()
    with pytest.raises(PhotoValidationError, match="too large"):
        asyncio.run(_read_upload_with_limit(upload, max_bytes=5))

    assert upload.read_sizes == [6, 2]
