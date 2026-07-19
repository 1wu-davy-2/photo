# Refresh Token Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure seven-day rotating refresh tokens and renew one-hour access tokens at half-life without exposing refresh credentials to frontend JavaScript.

**Architecture:** FastAPI stores SHA-256 refresh-token digests in MariaDB and rotates an HttpOnly cookie on every refresh. React stores only short-lived access-session metadata, performs one deduplicated refresh at the 30-minute mark, and retries restoration after tab suspension or page reload.

**Tech Stack:** FastAPI, SQLAlchemy 2, MariaDB 11, PyJWT, React 18, TypeScript, Vitest, pytest

---

### Task 1: Refresh-token persistence and configuration

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/config.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing persistence/configuration test**

Add assertions that login creates one `RefreshToken` row whose `token_hash` is not the cookie value and whose expiry is seven days after creation.

- [ ] **Step 2: Run the test and verify RED**

Run: `python -m pytest backend/tests/test_auth_api.py -q`
Expected: collection/import failure because `RefreshToken` does not exist, or assertion failure because login does not set a cookie.

- [ ] **Step 3: Add the model and settings**

Add `RefreshToken` with UUID id, user id, unique 64-character token hash, timestamps, optional revocation timestamp, and replacement id. Add `auth_refresh_token_ttl_days`, `auth_refresh_cookie_name`, and `auth_refresh_cookie_secure` settings with defaults `7`, `lumen_refresh_token`, and `false`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `python -m pytest backend/tests/test_auth_api.py -q`
Expected: persistence/configuration assertions pass.

### Task 2: Backend login, rotation, replay rejection, and logout

**Files:**
- Modify: `backend/app/auth.py`
- Modify: `backend/app/api/auth.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write failing endpoint tests**

Add tests proving login sets an HttpOnly SameSite cookie, refresh returns a new access token and cookie, the old cookie cannot be reused, disabled-user and expired refreshes return 401, and logout clears and revokes its token without requiring a bearer token.

- [ ] **Step 2: Run the endpoint tests and verify RED**

Run: `python -m pytest backend/tests/test_auth_api.py -q`
Expected: `/api/auth/refresh` returns 404 and logout does not revoke a token.

- [ ] **Step 3: Implement minimal token services and routes**

Add opaque-token generation and SHA-256 hashing, database creation/rotation/revocation methods, cookie set/clear helpers, a response builder shared by login and refresh, and idempotent cookie-based logout. Commit the rotation transaction only after the replacement row is inserted.

- [ ] **Step 4: Run backend auth and full backend tests**

Run: `python -m pytest backend/tests/test_auth_api.py -q`
Expected: all auth tests pass.

Run: `python -m pytest backend/tests -q`
Expected: all backend tests pass.

### Task 3: Frontend session metadata and refresh client

**Files:**
- Modify: `frontend/src/auth/session.ts`
- Modify: `frontend/src/api/client.ts`
- Test: `frontend/src/auth/session.test.ts`
- Test: `frontend/src/api/client.test.ts`

- [ ] **Step 1: Write failing frontend unit tests**

Assert that a token response with `expires_in=3600` creates a `refreshAt` 30 minutes after receipt and that `refreshSession()` posts to `/api/auth/refresh` with `credentials: "include"` and maps the response into `AuthSession`.

- [ ] **Step 2: Run unit tests and verify RED**

Run: `npm test -- --run src/auth/session.test.ts src/api/client.test.ts`
Expected: missing `refreshAt`, mapper, or `refreshSession` failures.

- [ ] **Step 3: Implement session mapping and refresh request**

Introduce `TokenResponse`, `sessionFromTokenResponse()`, and `refreshAt`. Make login and refresh use `credentials: "include"`; keep refresh failures local so only the App decides whether to end the session.

- [ ] **Step 4: Run unit tests and verify GREEN**

Run: `npm test -- --run src/auth/session.test.ts src/api/client.test.ts`
Expected: all focused tests pass.

### Task 4: Half-life scheduler and suspended-tab recovery

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing application tests**

Use fake timers to prove App refreshes at `refreshAt`, saves the replacement session, attempts cookie restoration when no valid stored session exists, checks overdue refresh on `visibilitychange` and `focus`, and returns to login after refresh failure.

- [ ] **Step 2: Run App tests and verify RED**

Run: `npm test -- --run src/App.test.tsx`
Expected: no `/api/auth/refresh` request is made.

- [ ] **Step 3: Implement one refresh coordinator**

Add a single in-flight refresh promise, startup restoration state, a timeout scheduled for `refreshAt`, focus/visibility listeners, and a logout function that calls the backend before clearing the local session. Keep public share rendering outside this coordinator.

- [ ] **Step 4: Run App tests and verify GREEN**

Run: `npm test -- --run src/App.test.tsx`
Expected: all App tests pass.

### Task 5: Deployment migration and documentation

**Files:**
- Create: `backend/sql/007_refresh_tokens.sql`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `docs/operations.md`

- [ ] **Step 1: Add idempotent MariaDB migration**

Create `refresh_tokens` with matching column sizes, unique token hash, user and expiry indexes, and nullable revocation/replacement columns using utf8mb4.

- [ ] **Step 2: Add deployment variables and procedure**

Document the three refresh settings, require `AUTH_REFRESH_COOKIE_SECURE=true` after HTTPS is enabled, and include the exact MariaDB command for applying `007_refresh_tokens.sql` before restarting the backend.

### Task 6: Final verification and local commit

**Files:**
- Verify all modified files

- [ ] **Step 1: Run complete verification**

Run: `python -m pytest backend/tests -q`
Expected: all backend tests pass.

Run: `npm test`
Expected: all frontend tests pass.

Run: `npm run build`
Expected: TypeScript and Vite production build succeed.

Run: `git diff --check`
Expected: no output.

- [ ] **Step 2: Commit locally without pushing**

Run: `git add backend frontend .env.example docker-compose.yml docs && git commit -m "feat: add rotating session refresh"`
Expected: one local commit on `main`; `origin/main` remains unchanged until the user requests a push.
