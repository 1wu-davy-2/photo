# Photo Derivatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store untouched originals separately from compact WebP derivatives and make every frontend surface request the appropriate image size, with an in-lightbox original viewer.

**Architecture:** `PhotoService` owns derivative keys and storage lifecycle while a focused `image_processing` module owns Pillow transformations. `MinioStorage` exposes explicit origin/preview bucket operations, and API routes select content variants without exposing original images to public shares. The React client carries a typed image variant through URL construction and blob caching.

**Tech Stack:** Python 3.12, FastAPI, Pillow, MinIO SDK, SQLAlchemy, pytest, React 18, TypeScript, Vitest, Testing Library

---

### Task 1: Configuration and bucket-aware storage

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/storage.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`
- Create: `backend/tests/test_storage.py`

- [ ] **Step 1: Write failing settings and storage tests**

Add tests asserting that `Settings(minio_bucket="legacy")` resolves the origin bucket to `legacy`, an explicit origin bucket wins, `ensure_buckets()` checks both buckets, and origin/preview methods pass the correct bucket to the MinIO client.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `python -m pytest backend/tests/test_storage.py -v`

Expected: failures because `minio_origin_bucket`, `minio_preview_bucket`, bucket-specific methods, and `ensure_buckets()` do not exist.

- [ ] **Step 3: Implement settings fallback and explicit storage methods**

Add `minio_origin_bucket` and `minio_preview_bucket` settings. Refactor storage to expose `put_origin`, `get_origin`, `remove_origin`, `move_origin`, `put_preview`, `get_preview`, and `remove_preview`, and make startup call `ensure_buckets()`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `python -m pytest backend/tests/test_storage.py -v`

Expected: all tests pass.

### Task 2: Deterministic WebP derivative generation

**Files:**
- Create: `backend/app/image_processing.py`
- Create: `backend/tests/test_image_processing.py`

- [ ] **Step 1: Write failing image-processing tests**

Cover an RGB image larger than 1920 pixels, a transparent PNG, and an EXIF-rotated JPEG. Assert derivative media type is WebP, no dimension is enlarged, thumbnail longest edge is at most 300, preview longest edge is at most 1920, byte limits are respected, transparency remains present, and orientation is applied.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `python -m pytest backend/tests/test_image_processing.py -v`

Expected: import failure because the module does not exist.

- [ ] **Step 3: Implement bounded derivative encoding**

Create immutable `ImageDerivative` and `ImageDerivatives` result types. Implement `generate_derivatives(payload)` using `ImageOps.exif_transpose`, first-frame conversion, Lanczos resampling, WebP quality reduction, and bounded dimension reduction until each size budget is met or the configured minimum size is reached.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `python -m pytest backend/tests/test_image_processing.py -v`

Expected: all tests pass.

### Task 3: Upload, lazy generation, cleanup, and content selection

**Files:**
- Modify: `backend/app/services/photos.py`
- Modify: `backend/app/api/photos.py`
- Modify: `backend/app/api/photo_walls.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_photo_api.py`
- Modify: `backend/tests/test_photo_wall_api.py`

- [ ] **Step 1: Write failing API lifecycle tests**

Update the memory storage fixture to track origin and preview buckets. Add tests asserting upload creates one original and two derivatives, default and `width=1920` return preview WebP, `width=300` returns thumbnail WebP, `original=true` and `/download` return original bytes, missing derivatives are generated lazily, public shares return preview WebP, and deletion removes all three objects. Add a storage-failure test asserting partial writes are cleaned up.

- [ ] **Step 2: Run API tests and verify RED**

Run: `python -m pytest backend/tests/test_photo_api.py backend/tests/test_photo_wall_api.py -v`

Expected: assertions fail because uploads and routes still use one object bucket and original content.

- [ ] **Step 3: Implement service lifecycle and API variant routing**

Add deterministic derivative key helpers and a `PhotoContent` result carrying object response, MIME type, and original flag. Generate derivatives during upload, clean up every written object on failure, lazily backfill both variants when either is missing, and remove both derivatives on delete. Make async endpoints call synchronous processing/storage through `run_in_threadpool`. Restrict authenticated width to `Literal[300, 1920]`, keep original access explicit, make download origin-only, and make public wall content preview-only.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `python -m pytest backend/tests/test_photo_api.py backend/tests/test_photo_wall_api.py -v`

Expected: all tests pass.

### Task 4: Variant-aware frontend client and image component

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.test.ts`
- Modify: `frontend/src/components/AuthenticatedImage.tsx`
- Create: `frontend/src/components/AuthenticatedImage.test.tsx`
- Modify: `frontend/src/components/PhotoGrid.tsx`
- Modify: `frontend/src/components/ManagementPage.tsx`
- Modify: `frontend/src/components/PhotoWallPage.tsx`
- Modify: `frontend/src/components/PhotoWallLibraryPage.tsx`
- Modify: `frontend/src/components/PhotoWallSharePage.tsx`

- [ ] **Step 1: Write failing client and component tests**

Assert `fetchPhotoBlobUrl` adds `width=300`, `width=1920`, or `original=true`; `downloadPhoto` calls `/download`; `AuthenticatedImage` passes its requested variant and keeps different variants in separate cache entries; and public wall photos use the preview endpoint.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run: `npm test -- --run src/api/client.test.ts src/components/AuthenticatedImage.test.tsx`

Expected: failures because image variants are not represented in the client or component.

- [ ] **Step 3: Implement typed image variants and update call sites**

Define `PhotoImageVariant = "thumbnail" | "preview" | "original"`. Build query parameters from that type, make downloads fetch `/download`, include variant in blob-cache keys, default `AuthenticatedImage` to thumbnail, and set wall canvas/share call sites to preview while list and asset surfaces use thumbnail.

- [ ] **Step 4: Run focused frontend tests and verify GREEN**

Run: `npm test -- --run src/api/client.test.ts src/components/AuthenticatedImage.test.tsx`

Expected: all focused tests pass.

### Task 5: In-lightbox original viewing

**Files:**
- Modify: `frontend/src/components/PhotoLightbox.tsx`
- Create: `frontend/src/components/PhotoLightbox.test.tsx`
- Modify: `frontend/src/i18n.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing lightbox interaction test**

Render the lightbox and assert the initial image variant is `preview`. Click `查看原图`, assert a loading state is announced, then assert the same lightbox switches to `original` and displays `已加载原图`. Confirm `下载原图` remains a separate button.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/components/PhotoLightbox.test.tsx`

Expected: failure because the current action opens a new browser tab and has no loading state.

- [ ] **Step 3: Implement current-lightbox original loading**

Track `preview | original` and loading state inside `PhotoLightbox`, reset to preview when the photo changes, place the original-view control at the bottom right, disable it while loading or after success, and use bilingual labels for view, loading, loaded, and download-original states.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run src/components/PhotoLightbox.test.tsx`

Expected: all focused tests pass.

### Task 6: Environment, Compose, and operations

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `docs/operations.md`

- [ ] **Step 1: Update all environment variants**

Set the local endpoint to `18.221.246.24:9000`, keep `MINIO_BUCKET` for compatibility, add `MINIO_ORIGIN_BUCKET=yanshi`, and add `MINIO_PREVIEW_BUCKET=yanshi-preview`. Add the same keys with safe example credentials to `.env.example` and Compose defaults.

- [ ] **Step 2: Document deployment and backfill behavior**

Explain bucket permissions, lazy generation for existing photos, and how to verify both MinIO health and the two application buckets without printing credentials.

- [ ] **Step 3: Verify configuration loading**

Run: `docker compose config --quiet`

Expected: exit code 0.

### Task 7: Full verification and local acceptance server

**Files:**
- Modify only if verification reveals a regression.

- [ ] **Step 1: Run all backend tests**

Run: `python -m pytest backend/tests -q`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run all frontend tests**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Build the production frontend**

Run: `npm run build`

Expected: TypeScript and Vite finish with exit code 0.

- [ ] **Step 4: Start local services and perform browser verification**

Start backend on port 6555 and frontend on port 6222. Log in, verify thumbnail requests include `width=300`, open a photo and verify `width=1920`, click `查看原图` and verify `original=true`, download the original, and inspect a public wall preview. Confirm no console errors and no overlapping controls at desktop and mobile widths.

- [ ] **Step 5: Report local URL without pushing**

Provide `http://127.0.0.1:6222` and the fresh test/build results. Leave all GitHub state unchanged until the user explicitly approves a push.
