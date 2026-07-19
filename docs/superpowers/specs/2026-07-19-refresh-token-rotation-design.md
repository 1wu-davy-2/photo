# Refresh Token Rotation Design

## Objective

Keep the existing one-hour JWT access token while renewing it proactively at half-life. A seven-day rotating refresh token keeps an active browser session signed in without exposing long-lived credentials to JavaScript.

## Security Model

- Access tokens remain HS256 JWTs with a 60-minute default lifetime.
- Refresh tokens are 32-byte opaque random values. Only a SHA-256 digest is stored in MariaDB.
- The browser receives the refresh token only as an `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/auth`.
- Every successful refresh revokes the presented database row and creates a replacement token and cookie in the same transaction.
- A five-second rotation grace returns HTTP 409 without clearing the shared cookie, allowing another browser tab to retry with the replacement cookie. Reuse outside that window revokes the complete replacement chain.
- Expired, missing, disabled-user, or replayed refresh tokens return HTTP 401 and clear the cookie.
- Logout is idempotent: it revokes the cookie token when present and clears the cookie even if the access token has expired.
- `Secure` is configurable because local and current server deployments use HTTP. Production HTTPS deployments must enable it.

## Backend Flow

`POST /api/auth/login` authenticates the password, issues the access token, creates a refresh-token row, and sets the cookie. `POST /api/auth/refresh` reads the cookie, locks and validates its row, revokes it, creates its replacement, and returns a normal access-token response. `POST /api/auth/logout` requires no bearer token; it revokes the supplied refresh token when possible and always expires the cookie.

The `refresh_tokens` table stores `id`, `user_id`, `token_hash`, `created_at`, `expires_at`, `revoked_at`, and `replaced_by_id`. Indexes support hash lookup, user revocation, and expiry cleanup. Application startup creates the table for new installations; `007_refresh_tokens.sql` upgrades an existing MariaDB database.

## Frontend Flow

The frontend stores only the access token, user, access-token expiry, and calculated refresh time in `sessionStorage`. A non-sensitive refresh-session hint is kept in `localStorage` so a new tab can attempt the HttpOnly cookie; no token is stored there. It calls `/api/auth/refresh` with browser credentials at local receipt time plus `expires_in / 2`, then replaces the session and schedules the next refresh. A shared in-flight promise prevents duplicate refresh calls.

On startup, an expired or missing access session attempts one cookie refresh before showing login. Window focus and document visibility changes check whether refresh is due, covering suspended background tabs. A failed refresh clears local state and returns to login. An authenticated request that races access-token expiry waits for one shared refresh and retries once, including uploads. Logout ignores late refresh responses and waits for an in-flight rotation before revoking the resulting server cookie. Public shared photo-wall routes remain independent of authentication.

Expired refresh-token history older than an additional seven-day replay-detection window is removed opportunistically during login and rotation.

## Configuration

- `AUTH_TOKEN_TTL_MINUTES=60`
- `AUTH_REFRESH_TOKEN_TTL_DAYS=7`
- `AUTH_REFRESH_COOKIE_NAME=lumen_refresh_token`
- `AUTH_REFRESH_COOKIE_SECURE=false` for HTTP development; `true` behind HTTPS

## Verification

Backend tests cover cookie attributes, token hashing, rotation, replay rejection, expiry, disabled users, and logout revocation. Frontend tests cover half-life metadata, credentialed refresh calls, startup restoration, scheduled refresh, wake-up refresh, and failure logout. Full backend tests, frontend tests, TypeScript build, and `git diff --check` must pass.
