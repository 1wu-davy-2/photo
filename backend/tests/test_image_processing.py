from __future__ import annotations

from io import BytesIO

from PIL import Image

from backend.app.image_processing import generate_derivatives


def image_payload(image: Image.Image, image_format: str, **save_kwargs) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format=image_format, **save_kwargs)
    return buffer.getvalue()


def test_generates_bounded_webp_thumbnail_and_preview_without_upscaling():
    source = Image.effect_noise((2400, 1600), 80).convert("RGB")

    derivatives = generate_derivatives(image_payload(source, "JPEG", quality=95))

    assert derivatives.thumbnail.media_type == "image/webp"
    assert max(derivatives.thumbnail.width, derivatives.thumbnail.height) <= 300
    assert len(derivatives.thumbnail.payload) <= 100 * 1024
    assert derivatives.preview.media_type == "image/webp"
    assert max(derivatives.preview.width, derivatives.preview.height) <= 1920
    assert len(derivatives.preview.payload) <= 1024 * 1024

    small_source = Image.new("RGB", (120, 80), "#2454A6")
    small = generate_derivatives(image_payload(small_source, "PNG"))
    assert (small.thumbnail.width, small.thumbnail.height) == (120, 80)
    assert (small.preview.width, small.preview.height) == (120, 80)


def test_preserves_transparency_in_webp_derivatives():
    source = Image.new("RGBA", (480, 320), (38, 119, 191, 0))
    source.paste((255, 91, 127, 255), (80, 60, 400, 260))

    derivatives = generate_derivatives(image_payload(source, "PNG"))

    with Image.open(BytesIO(derivatives.thumbnail.payload)) as thumbnail:
        assert thumbnail.format == "WEBP"
        assert "A" in thumbnail.getbands()
        assert thumbnail.getchannel("A").getextrema() == (0, 255)


def test_applies_exif_orientation_before_generating_derivatives():
    source = Image.new("RGB", (40, 80), "#163E73")
    exif = Image.Exif()
    exif[274] = 6

    derivatives = generate_derivatives(image_payload(source, "JPEG", exif=exif))

    assert (derivatives.thumbnail.width, derivatives.thumbnail.height) == (80, 40)
    assert (derivatives.preview.width, derivatives.preview.height) == (80, 40)
