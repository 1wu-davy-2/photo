# Photo Preview Upload Service Task Plan

Status: complete (authentication and production configuration update included)

1. [x] Inspect the empty workspace and confirm there is no existing repository or application to extend.
2. [x] Choose the architecture: React/Vite SPA, FastAPI API, MariaDB metadata, MinIO objects, Docker Compose.
3. [x] Define the scope: upload, preview, search, sort, download, delete, health check, and deployment docs.
4. [x] Create the backend and frontend foundation with documented environment variables.
5. [x] Write backend and frontend tests first and verify the RED state.
6. [x] Implement backend validation, storage orchestration, API routes, and startup checks.
7. [x] Implement the React gallery, upload workflow, lightbox, responsive styles, and UI states.
8. [x] Build the Docker/Nginx path and verify local end-to-end behavior.
9. [x] Run tests, builds, Compose validation, and browser smoke checks.
10. [x] Finalize README and operations documentation.

Feature extension: localization, routing, user and folder management:

11. [x] Add bilingual locale state and protected hash routes.
12. [x] Add folder ownership, default folders, and photo ownership migration.
13. [x] Add user CRUD and folder/photo management APIs with admin checks.
14. [x] Add recent owned gallery, user management, and directory management UI.
15. [x] Apply migration and run full backend/frontend/browser verification.

Key decisions:

- MinIO is accessed only by the backend; the browser uses `/api/photos/{id}/content`.
- Original files are persisted; thumbnails are deferred to keep the first release compact.
- The default upload limit is 25 MB and is configurable with `MAX_UPLOAD_SIZE_MB`.
- The existing MariaDB and MinIO services are treated as external by default; Compose includes an optional MariaDB profile for local completeness.

Authentication and deployment update:

- [x] Add Bearer JWT login with configurable 60-minute default TTL.
- [x] Protect photo list/upload/content/download/delete routes and add `/api/auth/me`.
- [x] Add frontend login screen, token injection, protected blob previews/downloads, logout, and expiry redirect.
- [x] Configure target MariaDB/MinIO endpoints, `photo` database, `yanshi` bucket, CORS wildcard mode, and ports 6222/6555 in local `.env`.
- [x] Add PBKDF2 admin password hash and production weak-secret validation.
- [x] Add `backend/sql/001_initial_schema.sql` and document versioned SQL updates.
