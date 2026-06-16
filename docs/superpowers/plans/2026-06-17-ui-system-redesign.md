# UI System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the production UI into a consistent, data-dense management console.

**Architecture:** Keep React + Ant Design, add a thin local UI component layer and global stylesheet, then refactor each page to use the same page shell, toolbar, metric, tag, and table patterns. No backend contract changes.

**Tech Stack:** React 18, Ant Design 5, ECharts, dayjs, CSS.

---

### Task 1: Shared UI Layer

**Files:**
- Create: `frontend/src/components/ui.js`
- Create: `frontend/src/styles/ui.css`
- Modify: `frontend/src/index.js`
- Modify: `frontend/src/components/Layout.js`

- [ ] Create reusable `PageShell`, `Toolbar`, `MetricCard`, `MoneyText`, `TypeTag`, `RecordCount`, and `tablePagination` helpers.
- [ ] Add global layout, table, modal, button, and responsive CSS.
- [ ] Import the stylesheet in `frontend/src/index.js`.
- [ ] Update `Layout.js` to use the new visual shell while preserving navigation and password modal.

### Task 2: Dashboard

**Files:**
- Modify: `frontend/src/pages/Home.js`

- [ ] Replace ad-hoc cards with metric cards and clear date scope.
- [ ] Add a compact insight row for top script, top DM, and session count.
- [ ] Keep chart behavior and navigation actions.

### Task 3: CRUD Pages

**Files:**
- Modify: `frontend/src/pages/DmManagement.js`
- Modify: `frontend/src/pages/ScriptManagement.js`
- Modify: `frontend/src/pages/SessionManagement.js`
- Modify: `frontend/src/pages/CashflowManagement.js`
- Modify: `frontend/src/pages/ReimbursementManagement.js`

- [ ] Use `PageShell` and `Toolbar`.
- [ ] Use consistent action groups and table pagination.
- [ ] Add readable tags, money text, row counts, and selected-row feedback.
- [ ] Add horizontal scroll and fixed operation columns where needed.

### Task 4: Salary Page

**Files:**
- Modify: `frontend/src/pages/SalaryCalculation.js`

- [ ] Use `PageShell` and structured salary action toolbar.
- [ ] Add salary result summary metrics.
- [ ] Improve calculation and settlement table readability.

### Task 5: Validate, Commit, Push, Deploy

**Files:**
- Modify: `CHANGELOG.md`

- [ ] Run frontend build.
- [ ] Run backend auth and salary date tests.
- [ ] Run browser visual check if available.
- [ ] Update changelog.
- [ ] Commit and push to GitHub.
- [ ] Deploy to cloud server.
- [ ] Verify production URL and key APIs.
