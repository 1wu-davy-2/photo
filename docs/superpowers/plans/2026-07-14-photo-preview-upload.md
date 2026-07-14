# Photo Preview Upload Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Docker-deployable React + FastAPI photo preview and upload service backed by MariaDB metadata and MinIO objects.

**Architecture:** A same-origin React/Vite frontend is served by Nginx, with `/api` proxied to a FastAPI backend. The backend validates images, stores originals in MinIO, and stores searchable metadata in MariaDB. Docker Compose supports the app services and an optional local MariaDB service while allowing an existing database and MinIO to be configured through environment variables.

**Tech Stack:** React 18, TypeScript, Vite, CSS, lucide-react, Python 3.12, FastAPI, SQLAlchemy, PyMySQL, Pillow, MinIO SDK, pytest, Docker Compose, Nginx.

---

### Task 1: Create project foundation and deployment contract

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Write deployment and dependency files**

  Pin the application contract to Python 3.12, Node 20, FastAPI, SQLAlchemy, PyMySQL, Pillow, MinIO SDK, React, TypeScript, Vite, and lucide-react. Document variables for `DATABASE_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE`, `MAX_UPLOAD_SIZE_MB`, and `CORS_ORIGINS`.

- [ ] **Step 2: Run dependency/configuration checks**

  Run `python --version`, `node --version`, and `docker compose config` after supplying a temporary local `.env` only when needed. Expected: Python 3.12+, Node 20+, and a valid Compose configuration.

- [ ] **Step 3: Commit the foundation**

  Run `git add . && git commit -m "chore: scaffold photo service deployment"` only if the directory is initialized as a git repository. This workspace is currently not a git repository, so preserve the files without forcing repository metadata.

### Task 2: Add backend tests for the photo contract

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_photo_validation.py`
- Create: `backend/tests/test_photo_api.py`

- [ ] **Step 1: Write failing tests**

  Cover: unsupported extension/content, empty files, the configured size cap, valid image metadata extraction, list search/sort response shape, missing content returning 404, and delete removing the record.

- [ ] **Step 2: Run tests and verify expected failure**

  Run `python -m pytest backend/tests -q`. Expected: collection/import failures because the backend application modules do not exist yet. Fix only test setup errors until the failures identify missing behavior.

### Task 3: Implement backend configuration, database, and storage boundaries

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`
- Create: `backend/app/storage.py`
- Create: `backend/app/schemas.py`

- [ ] **Step 1: Implement typed settings and SQLAlchemy model**

  Use environment-backed settings, a UUID string primary key, the `photos` table fields from the design, and a session dependency that can be overridden by tests.

- [ ] **Step 2: Implement MinIO storage adapter**

  Expose `ensure_bucket`, `put_object`, `get_object`, and `remove_object`, keeping MinIO credentials inside the backend process. Use a generated object key under `photos/YYYY/MM/`.

- [ ] **Step 3: Run focused tests**

  Run `python -m pytest backend/tests/test_photo_validation.py -q`. Expected: validation and storage-boundary tests pass or fail only on the next missing service behavior.

### Task 4: Implement photo service and API routes

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/photos.py`
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/photos.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Implement service behavior**

  Read each upload once into bounded memory, validate with Pillow, calculate SHA-256, extract dimensions, upload to MinIO, insert metadata, and clean up the object if database persistence fails. Implement list query filtering and sorting, content streaming, download disposition, and delete cleanup.

- [ ] **Step 2: Implement FastAPI routes and startup**

  Add `/api/health`, `/api/photos`, `/api/photos/upload`, `/api/photos/{id}/content`, `/api/photos/{id}/download`, and `/api/photos/{id}` DELETE. Initialize the database tables and MinIO bucket on startup, add CORS, and convert domain errors to JSON responses.

- [ ] **Step 3: Run backend tests and health check**

  Run `python -m pytest backend/tests -q` and `python -m uvicorn app.main:app --app-dir backend --port 8000` in a temporary process, then request `http://127.0.0.1:8000/api/health`. Expected: tests pass and health returns HTTP 200 when dependencies are reachable.

### Task 5: Add frontend tests and React application

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types/photo.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/components/AppShell.tsx`
- Create: `frontend/src/components/FilterBar.tsx`
- Create: `frontend/src/components/UploadDropzone.tsx`
- Create: `frontend/src/components/PhotoGrid.tsx`
- Create: `frontend/src/components/PhotoLightbox.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

  Test that the dashboard renders loading/empty state, search and sort controls are present, an upload file is accepted, and the lightbox opens from a photo card. Use mocked `fetch` only at the browser boundary.

- [ ] **Step 2: Run the frontend test and verify RED**

  Run `npm --prefix frontend test -- --run`. Expected: missing-module or missing-component failures before implementation.

- [ ] **Step 3: Implement the React experience**

  Build the “night gallery / electric citrus” visual system: responsive shell, animated upload dropzone, dense but airy photo grid, metadata chips, filter bar, keyboard-accessible dialog, and clear empty/loading/error states. Use lucide-react icons in command buttons and respect `prefers-reduced-motion`.

- [ ] **Step 4: Run frontend tests and build**

  Run `npm --prefix frontend test` and `npm --prefix frontend run build`. Expected: all tests pass and Vite emits `frontend/dist` without TypeScript errors.

### Task 6: Connect production serving and local development

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/nginx.conf`
- Modify: `docker-compose.yml`
- Modify: `README.md`

- [ ] **Step 1: Configure Vite and Nginx API proxy**

  Proxy `/api` to `http://localhost:8000` during local development and to the Compose backend service in production. Configure SPA fallback and long-cache headers for hashed assets.

- [ ] **Step 2: Start the services**

  Run `docker compose up -d --build` with the configured MariaDB and MinIO values. Expected: frontend is reachable on port 8080 and backend health is reachable through `/api/health`.

- [ ] **Step 3: Verify the end-to-end flow**

  Upload a small JPG, refresh the page, search by original name, open the lightbox, download it, and delete it. Check both MariaDB metadata and the MinIO object through their configured service logs or clients.

### Task 7: Run final verification and document operations

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Create: `docs/operations.md`

- [ ] **Step 1: Run the full verification suite**

  Run backend tests, frontend tests, frontend build, `docker compose config`, and a Playwright smoke script against the running frontend. Expected: exit code 0 for all available commands, no browser console errors, and screenshots at desktop/mobile widths. If Docker is unavailable, record that Compose was validated as YAML only.

- [ ] **Step 2: Document backups and limits**

  Explain that MinIO objects and MariaDB rows must be backed up together, how to set the upload cap, how to use an external database, and how to update the stack.

- [ ] **Step 3: Review requirements against the design**

  Confirm React frontend, Python 3.12 backend, MariaDB integration, MinIO integration, upload/preview/download/delete, responsive visual states, and Docker deployment. Record any unavailable external-dependency verification explicitly.
