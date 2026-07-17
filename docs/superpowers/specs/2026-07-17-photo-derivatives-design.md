# Photo Derivatives Design

## Purpose

Routine gallery views must not download original images. Each upload keeps its original object for archival and creates compact derivatives for list and preview use. Existing photos receive the same derivatives on first access.

## Storage model

- `MINIO_ORIGIN_BUCKET` stores untouched originals. It defaults to the legacy `MINIO_BUCKET` value so existing deployments remain compatible.
- `MINIO_PREVIEW_BUCKET` stores generated WebP derivatives.
- Original keys keep the existing `folders/{folder_id}/{photo_id}.{extension}` format.
- Derivative keys are deterministic: `derived/{photo_id}/thumbnail.webp` and `derived/{photo_id}/preview.webp`.
- No database migration is required because derivative keys can be derived from the photo ID.

## Image processing

Pillow decodes the uploaded image, applies EXIF orientation, and uses the first frame of animated inputs. Images are never enlarged.

- Thumbnail: longest dimension at most 300 pixels, WebP, target at most 100 KiB.
- Preview: longest dimension at most 1920 pixels, WebP, target at most 1 MiB.
- Transparency is retained through RGBA output. Non-transparent images use RGB output.
- Encoding starts at a high quality and lowers quality in bounded steps. If quality alone is insufficient, dimensions are reduced and encoding repeats.
- Processing executes through FastAPI's thread pool so Pillow and MinIO calls do not block the event loop.

## API behavior

- `GET /api/photos/{id}/content?width=300` returns the thumbnail.
- `GET /api/photos/{id}/content?width=1920` returns the preview.
- `GET /api/photos/{id}/content` defaults to the preview for backward compatibility.
- `GET /api/photos/{id}/content?original=true` returns the untouched original.
- `GET /api/photos/{id}/download` always downloads the untouched original.
- Public photo-wall content always returns the preview and never accepts an original-image option.
- Derived responses use `image/webp` and private immutable caching for authenticated content. Public shared previews use public immutable caching.
- Original responses retain their original MIME type and a shorter private cache policy.

Only `300` and `1920` are accepted width variants. Other values return HTTP 422 through FastAPI query validation.

## Upload and lazy generation

New uploads are validated first, then both derivatives are created. The original and derivatives are written before the database transaction is committed. If any storage write or database operation fails, every object written for that upload is removed.

For an existing photo, requesting a missing derivative reads the original, generates both variants, writes both deterministic keys, and serves the requested variant. Concurrent duplicate generation is acceptable because writes are idempotent and target the same keys.

## Lifecycle

- Moving or renaming a photo only moves the original object. Derivative keys are independent of folder and filename.
- Deleting a photo removes the original, thumbnail, and preview objects before deleting database and photo-wall references.
- Application startup verifies both buckets. Production deployments are expected to pre-create them; the existing storage adapter can create a missing bucket when credentials permit it.

## Frontend behavior

- Gallery grids, management rows, photo-wall asset shelves, inspectors, and wall-library cards request the 300-pixel thumbnail.
- Photo-wall canvases and public shared walls request the 1920-pixel preview.
- The lightbox initially requests the 1920-pixel preview.
- A bottom-right `查看原图` / `View original` action loads the original into the current lightbox and shows loading and loaded states.
- `下载原图` / `Download original` remains a separate action and calls the download endpoint.
- Blob caching includes the requested variant in its cache key so thumbnail, preview, and original URLs cannot be mixed.

## Configuration

`.env`, `.env.example`, and Compose expose `MINIO_ORIGIN_BUCKET` and `MINIO_PREVIEW_BUCKET`. The local `.env` points to the current MinIO endpoint and uses `yanshi` plus `yanshi-preview`. Secrets remain untracked.

## Verification

Backend tests cover generation bounds, upload storage, width routing, lazy generation, original download, public preview-only behavior, failure cleanup, and deletion cleanup. Frontend tests cover query construction, original download routing, variant-aware image caching, and the lightbox transition. Full backend tests, frontend tests, TypeScript production build, and browser verification are required before handoff.
