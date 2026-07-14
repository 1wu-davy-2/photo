# Gallery Management Design

## Goal

Extend Lumen Archive with Chinese/English localization, protected route navigation, an owner-scoped recent gallery, administrator user management, and safe folder/photo management backed by MariaDB and MinIO.

## Decisions

- The default locale is `zh-CN`; `en-US` is persisted in `localStorage` and can be changed from the authenticated shell.
- Hash routes are used to avoid adding a router dependency: `#/` for the recent gallery, `#/users` for administrator user management, and `#/manage` for folder and asset management.
- Normal users can read and mutate only their own folders and photos. Administrators can manage all users, folders, and photos.
- Each user receives a default `图库` folder during user creation and startup backfill. It cannot be deleted or moved.
- The home route returns the latest 24 photos belonging to the current user. Administrator-owned photos are never included in another user's home feed; administrators use the management route for the full view.
- Photo uploads default to the current user's default folder. Moving a photo updates its folder metadata and MinIO object key through a copy-then-delete operation. Renaming updates the stored filename and the object key extension-preserving path.
- A folder deletion is rejected while it contains photos or child folders. This makes deletion explicit and prevents accidental recursive object deletion.
- User deletion is restricted to administrators and is rejected for the current account, the final administrator, or a user with owned assets unless those assets are moved/deleted first.

## Backend

Add `Folder` metadata and ownership columns to `Photo`. Maintain fresh-install schema in `001_initial_schema.sql` and an idempotent upgrade in `003_folders_and_ownership.sql`. Startup backfills existing photos to the administrator's default folder.

Add admin-only user CRUD endpoints, owner-aware folder CRUD endpoints, and photo management endpoints for listing all assets, moving, renaming, and deleting. Keep all storage access behind the backend and preserve bearer-token checks on every protected route.

## Frontend

Add a small typed translation dictionary and route state in the application shell. The shell gets a compact navigation menu with active route state, locale toggle, upload action, current user, and logout. The home page becomes a focused recent-photo grid. The management page uses a folder tree/list alongside a dense asset table/grid with create, rename, move, delete, and file rename actions. The user page is visible only to administrators.

## Error handling and security

- API responses use clear 400/403/404/409 errors for invalid ownership, missing folders, forbidden operations, and non-empty folder deletion.
- Database changes are transactional. MinIO moves are copy-then-delete; database metadata is committed only after the new object exists, with cleanup on failure.
- Passwords remain PBKDF2 hashes. User creation and password changes never accept or return password hashes.
- The UI removes the session on any 401 and redirects to login as the existing authentication flow does.

## Verification

- Backend tests cover folder seeding, owner isolation, user CRUD permissions, folder CRUD, photo move/rename/delete, and MinIO failure cleanup.
- Frontend tests cover default Chinese, locale switching, protected menu visibility, route navigation, recent-photo page size, and administrator management actions.
- Run Python tests, TypeScript/Vitest tests, production build, compilation, and Playwright smoke flows for normal user and administrator routes.
