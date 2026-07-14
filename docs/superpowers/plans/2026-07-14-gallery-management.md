# Gallery Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bilingual protected navigation, owner-scoped recent photos, administrator user management, and safe folder/photo CRUD.

**Architecture:** Extend the existing FastAPI/SQLAlchemy/MinIO backend with user and folder ownership checks, versioned MariaDB migrations, and storage move operations. Extend the existing React SPA with a typed translation dictionary and hash-based protected routes so no new router dependency is required.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, MariaDB, MinIO, React 18, TypeScript, Vite, Vitest, Playwright.

---

### Task 1: Database and domain model

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/main.py`
- Modify: `backend/sql/001_initial_schema.sql`
- Create: `backend/sql/003_folders_and_ownership.sql`
- Test: `backend/tests/test_management_api.py`

- [ ] Add `Folder`, `Photo.owner_id`, and `Photo.folder_id` model fields with indexes.
- [ ] Add fresh-install folder tables and ownership fields to the initial schema.
- [ ] Add an idempotent MariaDB migration that backfills existing photos into the administrator's default folder.
- [ ] Seed a default `图库` folder for every active user at startup and after user creation.
- [ ] Write and run failing tests for default folder seeding and ownership fields.

### Task 2: Storage and backend services

**Files:**
- Modify: `backend/app/storage.py`
- Modify: `backend/app/services/photos.py`
- Create: `backend/app/services/folders.py`
- Create: `backend/app/services/users.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/auth.py`

- [ ] Add MinIO copy/move support and a memory-storage test implementation.
- [ ] Add owner-aware photo listing, upload, move, rename, and delete operations.
- [ ] Add folder CRUD with default-folder and non-empty-delete protections.
- [ ] Add user CRUD with password hashing and last-admin/current-user protections.
- [ ] Add admin dependency and typed response/request schemas.
- [ ] Write failing service/API tests before implementing each operation, then run them green.

### Task 3: Protected API routes

**Files:**
- Modify: `backend/app/api/photos.py`
- Create: `backend/app/api/folders.py`
- Create: `backend/app/api/users.py`
- Modify: `backend/app/main.py`

- [ ] Make the default photo list owner-scoped and add a recent 24-photo response path.
- [ ] Add administrator full-asset listing and photo management endpoints.
- [ ] Add folder CRUD and move/rename photo endpoints with permission checks.
- [ ] Add administrator-only user CRUD endpoints.
- [ ] Verify 401, 403, 404, and 409 behavior with focused tests.

### Task 4: Localization and routing

**Files:**
- Create: `frontend/src/i18n.ts`
- Create: `frontend/src/routing.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/auth/session.ts`
- Test: `frontend/src/App.test.tsx`

- [ ] Add Chinese default translations and English translations with persisted locale selection.
- [ ] Add hash routes for home, users, and management, with login redirect to home.
- [ ] Add API client methods and typed models for users, folders, and management photos.
- [ ] Add failing component tests for locale switching, route navigation, and page visibility.

### Task 5: User and management UI

**Files:**
- Modify: `frontend/src/components/AppShell.tsx`
- Create: `frontend/src/components/RecentGalleryPage.tsx`
- Create: `frontend/src/components/UserManagementPage.tsx`
- Create: `frontend/src/components/ManagementPage.tsx`
- Create: `frontend/src/components/FolderTree.tsx`
- Create: `frontend/src/components/ManagementPhotoTable.tsx`
- Modify: `frontend/src/components/PhotoLightbox.tsx`
- Modify: `frontend/src/styles.css`

- [ ] Add compact route menu and language toggle with active state.
- [ ] Make the home screen show the latest 24 photos for the current user.
- [ ] Build administrator user CRUD with safe confirmation and status controls.
- [ ] Build folder CRUD and asset move/rename/delete controls with responsive layouts.
- [ ] Keep the existing dark archive visual language while making labels fully localized.

### Task 6: Migration, verification, and local runtime

**Files:**
- Modify: `README.md`
- Modify: `docs/operations.md`
- Modify: `progress.md`
- Modify: `task_plan.md`

- [ ] Apply the new migration to the configured MariaDB database after local tests pass.
- [ ] Run backend tests, frontend tests, frontend production build, Python compilation, and API checks.
- [ ] Run Playwright desktop/mobile flows for login, route switching, language switching, folder CRUD, and photo actions.
- [ ] Restart local backend/frontend debug servers and record the URLs and verification output.
