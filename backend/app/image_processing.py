from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps

THUMBNAIL_MAX_EDGE = 300
THUMBNAIL_MAX_BYTES = 100 * 1024
PREVIEW_MAX_EDGE = 1920
PREVIEW_MAX_BYTES = 1024 * 1024
WEBP_QUALITIES = (86, 80, 74, 68, 62, 56, 50, 44, 38, 32)


@dataclass(frozen=True)
class ImageDerivative:
    payload: bytes
    width: int
    height: int
    media_type: str = "image/webp"


@dataclass(frozen=True)
class ImageDerivatives:
    thumbnail: ImageDerivative
    preview: ImageDerivative


def _normalized_first_frame(payload: bytes) -> Image.Image:
    with Image.open(BytesIO(payload)) as source:
        source.seek(0)
        oriented = ImageOps.exif_transpose(source)
        has_transparency = "A" in oriented.getbands() or "transparency" in oriented.info
        return oriented.convert("RGBA" if has_transparency else "RGB")


def _resize_to_edge(image: Image.Image, max_edge: int) -> Image.Image:
    resized = image.copy()
    resized.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    return resized


def _encode_webp(image: Image.Image, quality: int) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=6, exact=True)
    return buffer.getvalue()


def _encode_with_budget(image: Image.Image, *, max_edge: int, max_bytes: int) -> ImageDerivative:
    candidate = _resize_to_edge(image, max_edge)
    smallest_payload = b""

    for _ in range(10):
        for quality in WEBP_QUALITIES:
            payload = _encode_webp(candidate, quality)
            smallest_payload = payload
            if len(payload) <= max_bytes:
                return ImageDerivative(payload=payload, width=candidate.width, height=candidate.height)

        if max(candidate.size) <= 64:
            break
        next_size = (
            max(1, round(candidate.width * 0.85)),
            max(1, round(candidate.height * 0.85)),
        )
        candidate = candidate.resize(next_size, Image.Resampling.LANCZOS)

    return ImageDerivative(payload=smallest_payload, width=candidate.width, height=candidate.height)


def generate_derivatives(payload: bytes) -> ImageDerivatives:
    image = _normalized_first_frame(payload)
    return ImageDerivatives(
        thumbnail=_encode_with_budget(
            image,
            max_edge=THUMBNAIL_MAX_EDGE,
            max_bytes=THUMBNAIL_MAX_BYTES,
        ),
        preview=_encode_with_budget(
            image,
            max_edge=PREVIEW_MAX_EDGE,
            max_bytes=PREVIEW_MAX_BYTES,
        ),
    )
