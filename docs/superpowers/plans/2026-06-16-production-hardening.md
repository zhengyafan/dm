# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the DM management system into a production-ready cloud deployment with account/password login, protected APIs, environment-based configuration, deployment documentation, and GitHub-safe repository contents.

**Architecture:** The Express backend remains the single production service and serves the built React frontend. Authentication uses a SQLite-backed `User` table, Node `crypto` password hashes, and JWT-style bearer tokens. Production data stays outside GitHub through `.gitignore`, while deployment docs explain how to preserve SQLite and uploads on the server.

**Tech Stack:** Node.js, Express, Sequelize, SQLite, React, Ant Design, Axios, PM2, Nginx, GitHub.

---

### Task 1: Bring Source Into The Git Workspace

**Files:**
- Copy from: `/Users/avan/Downloads/DM-sys/backend`
- Copy from: `/Users/avan/Downloads/DM-sys/frontend`
- Create: `/Users/avan/Documents/DM剧本杀管理系统/.gitignore`

- [ ] **Step 1: Copy source without generated dependencies or private data**

Run:

```bash
rsync -a \
  --exclude 'backend/node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/build' \
  --exclude 'backend/database.sqlite' \
  --exclude 'backend/uploads' \
  /Users/avan/Downloads/DM-sys/ /Users/avan/Documents/DM剧本杀管理系统/
```

Expected: `backend`, `frontend`, `README.md`, and sample spreadsheet files appear in the workspace. `node_modules`, `database.sqlite`, and uploaded screenshots do not appear.

- [ ] **Step 2: Add Git ignore rules**

Create `.gitignore`:

```gitignore
.DS_Store
node_modules/
frontend/build/
backend/database.sqlite
backend/database.sqlite-*
backend/uploads/
backend/.env
*.log
npm-debug.log*
```

- [ ] **Step 3: Verify copied structure**

Run:

```bash
find backend frontend -maxdepth 2 -type f | sort | head -80
```

Expected: source files and package files are present. No `node_modules` or SQLite data file is listed.

### Task 2: Refactor Backend For Importable App And Configuration

**Files:**
- Create: `backend/config/index.js`
- Create: `backend/app.js`
- Modify: `backend/server.js`
- Modify: `backend/models/index.js`

- [ ] **Step 1: Add config module**

Create `backend/config/index.js` with:

```js
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: Number(process.env.PORT || 3001),
  rootDir,
  databasePath: process.env.DATABASE_PATH || path.join(rootDir, 'database.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  corsOrigin: process.env.CORS_ORIGIN || ''
};

function validateConfig() {
  if (config.isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
  }
}

module.exports = { config, validateConfig };
```

- [ ] **Step 2: Change Sequelize storage path**

Update `backend/models/index.js` so SQLite uses `config.databasePath` instead of `./database.sqlite`.

- [ ] **Step 3: Split Express app from server listener**

Move middleware and routes into `backend/app.js`, export `createApp()`, and keep `backend/server.js` responsible for validating config, syncing the database, seeding admin, and listening.

### Task 3: Add Authentication Model, Services, Middleware, And Tests

**Files:**
- Create: `backend/models/User.js`
- Create: `backend/services/authService.js`
- Create: `backend/middleware/auth.js`
- Create: `backend/routes/auth.js`
- Create: `backend/test/auth.test.js`
- Modify: `backend/package.json`
- Modify: `backend/app.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Add backend test script**

Use Node built-in `crypto`, `node:test`, and `fetch` so authentication adds no new npm dependencies.

Add script:

```json
"test": "node --test"
```

- [ ] **Step 2: Write failing auth tests**

Create tests that use a temporary SQLite file and assert:

```js
await request(app).get('/api/home/summary').expect(401);
await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' }).expect(401);
const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'secret123' }).expect(200);
await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
await request(app).get('/api/home/summary').set('Authorization', `Bearer ${login.body.token}`).expect(200);
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
cd backend
npm test
```

Expected: tests fail because auth files and dependencies do not exist yet.

- [ ] **Step 4: Implement auth**

Add the `User` model, password hashing, JWT creation/verification, admin seeding, auth routes, and auth middleware. Mount `/api/auth` publicly and mount all business API routes behind auth middleware.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
cd backend
npm test
```

Expected: auth tests pass.

### Task 4: Add Frontend Login Flow

**Files:**
- Modify: `frontend/src/api/index.js`
- Create: `frontend/src/auth/AuthContext.js`
- Create: `frontend/src/pages/Login.js`
- Modify: `frontend/src/App.js`
- Modify: `frontend/src/components/Layout.js`

- [ ] **Step 1: Add Axios auth behavior**

Add token storage helpers, `authApi`, request interceptor for `Authorization`, and response interceptor for `401`.

- [ ] **Step 2: Add auth context**

Create an `AuthProvider` that loads the current user from `/api/auth/me`, exposes `login`, `logout`, `user`, and `loading`.

- [ ] **Step 3: Add login page**

Create a simple Ant Design login form with username, password, submit loading state, and generic invalid login message.

- [ ] **Step 4: Protect routes**

Update `App.js` so `/login` is public and all existing pages require an authenticated user.

- [ ] **Step 5: Add logout affordance**

Update the layout header with current username and a logout button.

### Task 5: Add Production Deployment Docs

**Files:**
- Create: `backend/.env.example`
- Create: `docs/deployment.md`
- Modify: `README.md`

- [ ] **Step 1: Add env example**

Create `backend/.env.example` with production-safe placeholders for `NODE_ENV`, `PORT`, `DATABASE_PATH`, `UPLOAD_DIR`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_EXPIRES_IN`, and `CORS_ORIGIN`.

- [ ] **Step 2: Add deployment guide**

Document Ubuntu server setup, Node.js install, PM2, Nginx reverse proxy, firewall, first admin setup, backup, restore, restart, and GitHub clone workflow.

- [ ] **Step 3: Update README**

Link to `docs/deployment.md` and explain that production requires login credentials and a JWT secret.

### Task 6: Verify, Commit, Push, And Publish

**Files:**
- All intended project files.

- [ ] **Step 1: Install dependencies**

Run:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Expected: lockfiles include new dependencies.

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd backend
npm test
```

Expected: all backend tests pass.

- [ ] **Step 3: Build frontend**

Run:

```bash
cd frontend
npm run build
```

Expected: production build succeeds.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: source, docs, and lockfile changes only. No `node_modules`, `frontend/build`, `database.sqlite`, or `backend/uploads`.

- [ ] **Step 5: Configure GitHub remote if missing**

If `git remote -v` is empty, ask the user for the target GitHub repository URL or create one only if explicitly requested and authenticated tooling supports it.

- [ ] **Step 6: Commit and push**

Run:

```bash
git add .gitignore README.md backend frontend docs
git commit -m "feat: harden dm system for production deployment"
git push -u origin codex/production-hardening
```

Expected: branch is pushed to GitHub.
