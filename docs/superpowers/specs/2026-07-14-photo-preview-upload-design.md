# Photo Preview Upload Service Design

## Goal

Build a self-hosted photo preview and upload service for a 4 vCPU / 8 GB / 60 GB cloud server. The service provides a responsive React photo workspace, a Python 3.12 API, MariaDB metadata storage, and MinIO object storage. It is designed for a single trusted operator and should be deployable through Docker Compose while allowing the existing MariaDB and MinIO services to remain external.

## Product Scope

The first release includes:

- Photo upload through drag-and-drop or file selection.
- Image validation for JPG, PNG, WEBP, GIF, and AVIF by content type and Pillow decode.
- A searchable, sortable photo grid with newest-first and oldest-first modes.
- Image dimensions, file size, and upload date shown in the UI.
- Full-size preview in a keyboard-accessible lightbox.
- Download and delete actions.
- Empty, loading, uploading, error, and deletion states.
- A health endpoint for deployment checks.
- Docker Compose deployment with frontend, backend, and optional MariaDB services.

Explicitly out of scope for this release: multi-user accounts, public share links, folders/albums, image editing, AI tagging, video uploads, and background thumbnail generation.

## Recommended Approach

Three possible architectures were considered:

1. Browser-direct uploads to MinIO using presigned URLs. This reduces backend bandwidth, but it requires a second signed-upload lifecycle, more failure states, and exposing more storage configuration to the browser.
2. A React SPA plus FastAPI REST API where the API streams uploads to MinIO and serves previews through a protected content route. This keeps storage credentials server-side, keeps the browser contract simple, and fits the single-user scale.
3. A server-rendered application with React only for interactive islands. This reduces frontend tooling but does not satisfy the requested React-first experience as cleanly.

Approach 2 is selected. The expected traffic is small enough for API-mediated uploads, and the 4 vCPU / 8 GB instance can handle image metadata extraction without a queue. Upload size is capped by configuration, defaulting to 25 MB per file, to protect the server and the 60 GB disk.

## Architecture

```text
Browser
  |
  | same-origin /api/*
  v
Nginx + React static bundle
  |
  v
FastAPI service
  |                  |
  | SQLAlchemy       | MinIO Python SDK
  v                  v
MariaDB           MinIO bucket
  |
  v
Photo metadata    Original image objects
```

The frontend uses same-origin `/api` requests in production. Nginx proxies these requests to the backend and serves the React bundle. Local development uses Vite's `/api` proxy. The backend creates the configured bucket on startup if it does not exist, validates and reads the image once, calculates a SHA-256 checksum, extracts dimensions with Pillow, stores the object in MinIO, and then inserts the metadata record. If the database insert fails after object storage succeeds, the backend attempts to remove the orphaned object.

The content endpoint streams the original object from MinIO through FastAPI. The browser never receives MinIO credentials or an internal storage URL. This also means deployment can keep the MinIO console and API on private network bindings.

## Backend Units

- `backend/app/config.py`: typed environment settings and safe defaults.
- `backend/app/db.py`: SQLAlchemy engine, session dependency, and table initialization.
- `backend/app/models.py`: `Photo` metadata model.
- `backend/app/storage.py`: MinIO client, bucket creation, put/get/remove operations.
- `backend/app/schemas.py`: request/query/response schemas.
- `backend/app/services/photos.py`: validation, metadata extraction, and storage/database orchestration.
- `backend/app/api/photos.py`: photo list, upload, content, download, and delete routes.
- `backend/app/main.py`: application factory, CORS, startup initialization, and health route.

## Frontend Units

- `frontend/src/api/client.ts`: typed HTTP client and upload progress helper.
- `frontend/src/types/photo.ts`: API and UI types.
- `frontend/src/components/AppShell.tsx`: navigation/header shell and page framing.
- `frontend/src/components/UploadDropzone.tsx`: accessible upload surface and file input.
- `frontend/src/components/PhotoGrid.tsx`: responsive masonry-like CSS grid and photo cards.
- `frontend/src/components/PhotoLightbox.tsx`: preview dialog with keyboard and action controls.
- `frontend/src/components/FilterBar.tsx`: search and sort controls.
- `frontend/src/App.tsx`: page state orchestration.
- `frontend/src/styles.css`: visual system, responsive layout, motion, and state styling.

The visual direction is “night gallery / electric citrus”: near-black blue-green canvas, warm off-white type, lime primary action, cyan secondary accents, and restrained amber metadata. Typography uses a distinctive display face paired with a readable system fallback so the layout remains robust on a private deployment. Motion is limited to page reveal, upload progress, hover lift, and lightbox transitions, with reduced-motion support.

## API Contract

```text
GET    /api/health
GET    /api/photos?search=&sort=newest&page=1&page_size=48
POST   /api/photos/upload       multipart field: file
GET    /api/photos/{id}/content
GET    /api/photos/{id}/download
DELETE /api/photos/{id}
```

`GET /api/photos` returns `{items, total, page, page_size}`. Each item includes `id`, `original_name`, `mime_type`, `size_bytes`, `width`, `height`, and ISO timestamps. Upload errors use clear 400 responses for unsupported files, empty files, and size violations. Missing records return 404. Storage failures return 502 and do not create a metadata row.

## Data Model

The `photos` table stores:

- UUID primary key.
- MinIO object key.
- Original file name.
- MIME type.
- Size in bytes.
- Pixel width and height.
- SHA-256 checksum.
- Created and updated timestamps.

The object key is generated as `photos/YYYY/MM/<uuid>-<safe-extension>`, so original names are metadata only and cannot escape the storage prefix. The checksum is indexed to allow future deduplication without changing the public contract.

## Error Handling and Operations

- Environment configuration is loaded from `.env` and documented in `.env.example`.
- Health checks validate process availability and report database/storage initialization state.
- Upload cleanup removes an object when metadata persistence fails.
- Delete removes the database row only after the object removal succeeds, unless the object is already missing.
- Nginx exposes only the frontend and API proxy; MinIO remains configured as an external dependency.
- Docker health checks are included for frontend and backend.

## Testing Strategy

Backend tests use pytest and test the validation/service boundaries with a temporary SQLite database and an in-memory storage fake where practical. API tests cover health, upload validation, list search/sort, content-not-found, and delete behavior. Frontend verification uses a production build plus a Playwright smoke flow against the running Vite preview: load dashboard, inspect empty state, open upload surface, verify filter controls, and confirm no console errors. Docker Compose configuration is syntax-checked and the backend health route is exercised independently.

## Success Criteria

- `docker compose up -d --build` can start frontend and backend when `DATABASE_URL` and MinIO settings are supplied.
- A valid image can be uploaded and appears in the grid after the API returns.
- Preview, download, search, sort, and delete work without exposing MinIO credentials.
- Invalid/non-image files are rejected with a useful UI message.
- The interface works at desktop and mobile widths and has no blocking overlap in the core flows.
- Tests and build commands have fresh passing output before completion is reported.
