# Management Operations

## Existing database upgrade

Before restarting a deployment that already has the `photo` database, apply:

```sql
backend/sql/003_folders_and_ownership.sql
```

This migration creates the `folders` table, adds `owner_id` and `folder_id` to `photos`, creates a default `图库` folder for every existing user, and assigns legacy photos to the administrator's default folder. It is safe to run repeatedly.

## User behavior

- The application defaults to Chinese. The authenticated shell can switch to English; the choice is stored in the browser.
- `#/` shows the latest 24 photos owned by the signed-in user.
- `#/manage` manages the signed-in user's folders and photos. Administrators see the full asset scope.
- `#/users` is administrator-only and provides user creation, status changes, role changes, and deletion.
- Every user gets a default `图库` folder. It cannot be deleted. Non-empty folders cannot be deleted until their photos and child folders are moved.
- Photo rename changes the user-visible filename and moves the MinIO object to the new managed key. Photo move uses MinIO copy-then-delete and commits the database change only after the object move succeeds.

## Verification commands

```powershell
python -m pytest -q backend/tests
npm --prefix frontend test -- --run
npm --prefix frontend run build
```
