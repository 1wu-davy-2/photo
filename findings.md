# Findings

- The workspace `E:\opt\vide coding` was empty at the start of the task.
- There is no existing git repository, frontend, backend, Docker Compose file, or project documentation to preserve.
- The target server has 4 vCPU, 8 GB RAM, and 60 GB storage. The application should avoid heavyweight image processing and cap uploads.
- MinIO already exists on the target server, so deployment must accept external MinIO credentials and endpoint values.
- The user specified React for the frontend and Python 3.12 for the backend. The plan uses FastAPI and SQLAlchemy with a MariaDB-compatible PyMySQL driver.
- UI direction: a dark gallery workspace with lime/cyan accents, strong typography, restrained motion, and high information density around photo metadata.
- Production target config: MariaDB `101.43.75.72:3306`, database `photo`, UTF-8 `utf8mb4`; MinIO `18.220.22.229:9000`, bucket `yanshi`.
- Runtime ports: frontend `6222`, backend `6555` externally; backend listens on internal container port `8000`.
- CORS value `0.0.0.0` is intentionally interpreted as wildcard origins with credentials disabled; bearer tokens are sent in headers.
- The supplied MinIO bucket is public. Application routes still require JWT, but public object policy can bypass application authorization if an object URL is known.

## Feature extension findings

- Existing photos had no owner or folder fields; migration `003_folders_and_ownership.sql` adds nullable fields and backfills them to the administrator default folder.
- Default user folders are seeded on startup and after user creation; non-empty folder deletion is rejected with HTTP 409.
- The home photo list is owner-scoped with a default page size of 24; administrator full-scope listings require `scope=all`.
- Hash routes avoid adding a frontend router dependency: `#/`, `#/users`, and `#/manage`.
- The local Playwright shell used a non-UTF-8 PowerShell pipe, so stable CSS selectors were used for browser verification when Chinese literal selectors became `???`.
