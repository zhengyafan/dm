# DM System Production Hardening Design

## Context

The DM management system currently lives at `/Users/avan/Downloads/DM-sys`. It is a React application served by an Express backend, with Sequelize using a local SQLite database and reimbursement screenshots saved under `backend/uploads`. The frontend already calls APIs through relative `/api` paths, and the backend already serves `frontend/build`, so the application can be deployed as a single Node service behind Nginx.

The production version must allow users on other computers to use the full system through a server IP or domain while preventing public unauthenticated access.

## Goals

- Add account/password login before users can access business features.
- Store user accounts in SQLite with hashed passwords.
- Protect all business API routes by default.
- Keep deployment simple: one Node service, one SQLite database, one uploads directory, Nginx in front.
- Make database path, upload path, session secret, and production settings configurable through environment variables.
- Document cloud deployment, data backup, and recovery steps.
- Add automated tests for the new authentication boundary.

## Non-Goals

- Role-based permissions are not part of this version. All authenticated users have the same access.
- Self-service registration is not included. An initial administrator is created from environment variables.
- Replacing SQLite with MySQL/PostgreSQL is not included. SQLite remains suitable for this small internal operations system if backup is handled carefully.
- A separate frontend hosting service is not required. Express will continue serving the built React app.

## Recommended Approach

Use a database-backed user table with Node `crypto` password hashing and JWT-style bearer-token authentication.

This is more maintainable than a single hard-coded environment password and much lighter than a full permission system. It gives the store a real production login boundary now while preserving a path to add roles later.

## Backend Design

### Configuration

Create a small configuration module that reads environment variables and centralizes defaults:

- `PORT`: HTTP port, default `3001`.
- `NODE_ENV`: `development` or `production`.
- `DATABASE_PATH`: SQLite file path, default `backend/database.sqlite`.
- `UPLOAD_DIR`: uploaded file directory, default `backend/uploads`.
- `JWT_SECRET`: required in production.
- `JWT_EXPIRES_IN`: default `7d`.
- `ADMIN_USERNAME`: initial admin username.
- `ADMIN_PASSWORD`: initial admin password, required when the user table is empty.
- `CORS_ORIGIN`: optional allowed frontend origin. In same-origin production deployment, this can be omitted.

In production, startup should fail clearly when `JWT_SECRET` is missing. If the user table is empty and admin credentials are missing, startup should also fail clearly instead of silently exposing a broken login flow.

### User Model

Add a Sequelize `User` model with:

- `id`
- `username`, unique and required
- `password_hash`, required
- `display_name`, optional
- `is_active`, default `true`
- timestamps

Password hashing will use Node's built-in `crypto.pbkdf2` with a per-password random salt. This avoids adding native or registry-dependent authentication packages while still storing non-reversible password hashes.

### Initial Admin

On startup, after database sync:

1. Count active users.
2. If no users exist, create one using `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Hash the password before storing it.
4. Log only the created username, never the password.

This makes first deployment repeatable and avoids committing credentials to the repository.

### Auth Routes

Add `backend/routes/auth.js`:

- `POST /api/auth/login`
  - Accepts `username` and `password`.
  - Validates credentials.
  - Returns a JWT and a safe user object.
  - Uses generic error messages for invalid username/password.

- `GET /api/auth/me`
  - Requires a valid token.
  - Returns the current user.

The frontend handles logout by deleting its stored token.

### Auth Middleware

Add middleware that:

- Reads `Authorization: Bearer <token>`.
- Verifies the JWT.
- Loads the user from SQLite.
- Rejects missing, invalid, expired, inactive, or deleted users with `401`.
- Adds the safe user object to `req.user`.

Apply this middleware to all business routes:

- `/api/dm`
- `/api/script`
- `/api/session`
- `/api/salary`
- `/api/reimbursement`
- `/api/cashflow`
- `/api/home`

Do not apply it to:

- `/api/auth/login`
- Static frontend files
- Uploaded files served under `/uploads`

Uploaded reimbursement screenshots will remain public to anyone with a valid URL in this first version because changing them to signed or authenticated file access would require a larger frontend and export flow change. The system still protects screenshot discovery because business records require login.

### Production Safety

Add standard HTTP hardening:

- Secure response headers for content type sniffing, frames, referrers, and browser permissions.
- Request body size limits for JSON and form payloads.
- Centralized error handler that avoids leaking stack traces in production.
- Trust proxy when behind Nginx.

Keep CORS permissive in development, but in production prefer same-origin access through Nginx and the Express static frontend. If `CORS_ORIGIN` is set, only allow that origin.

## Frontend Design

### Auth State

Add an auth API and auth context:

- Store the JWT in `localStorage`.
- Add an Axios request interceptor that attaches `Authorization: Bearer <token>`.
- Add an Axios response interceptor that logs the user out on `401`.
- On app load, call `/api/auth/me` when a token exists.

Using `localStorage` is acceptable for this internal first version. A later version can move to httpOnly cookies if stricter browser-level token protection is needed.

### Login Page

Add a simple login page:

- Username field.
- Password field.
- Submit button.
- Loading state.
- Generic invalid login message.

The existing management layout is shown only after login. Unauthenticated users are redirected to login.

### Routes

Use guarded routes:

- `/login`: public.
- All existing routes: authenticated.

After successful login, route to the home dashboard.

## Data Persistence And Backup

Production deployment must preserve:

- SQLite database file configured by `DATABASE_PATH`.
- Upload directory configured by `UPLOAD_DIR`.

The deployment document should recommend paths such as:

- `/var/www/DM-sys/backend/database.sqlite`
- `/var/www/DM-sys/backend/uploads`

Backups should copy both the SQLite database and uploads directory. For SQLite, use `sqlite3 database.sqlite ".backup '/backup/path/database-YYYYMMDD.sqlite'"` when available, or stop the PM2 process briefly before copying for small installations.

## Deployment Design

Add:

- `.env.example` for backend production settings.
- Deployment documentation covering:
  - Installing Node.js, PM2, and Nginx.
  - Uploading project files without `node_modules`.
  - Running `npm ci`.
  - Building the frontend.
  - Starting the backend with PM2.
  - Nginx reverse proxy.
  - Firewall ports.
  - Backup and restore.

The final cloud architecture remains:

```text
Browser on any computer
  -> HTTP/HTTPS domain or server IP
  -> Nginx
  -> Express on 127.0.0.1:3001
  -> SQLite database + uploads directory
```

## Testing Strategy

Add focused backend tests for:

- Login succeeds with correct credentials.
- Login fails with wrong password.
- Business API returns `401` without a token.
- Business API works with a valid token.
- `/api/auth/me` returns the current user for a valid token.

Use Node's built-in test runner and native `fetch` against an ephemeral HTTP server. Refactor `server.js` so the Express app can be imported without listening on a port, while `server.js` remains the production entrypoint.

Frontend verification should include:

- Build succeeds.
- Login page appears when no token exists.
- Authenticated user can access the existing dashboard.

## Acceptance Criteria

- A fresh production server can start with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `JWT_SECRET`.
- The first admin account is created automatically when no users exist.
- Business API endpoints reject unauthenticated requests.
- Logging in from another computer allows full use of existing features.
- Refreshing the browser keeps the user logged in until the token expires or is removed.
- Existing Excel import/export and reimbursement screenshot upload still work.
- Deployment documentation explains setup, restart, backup, and restore.
