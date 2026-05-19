---
name: mock-exams-setup
description: Creates mock exam database tables then starts the frontend. Use when the user asks to create mock exam tables, set up mock exams database, or run mock exams setup and start the app.
---

# Mock Exams Setup

Run in order: (1) create mock exam tables in the database, (2) start the frontend dev server.

## Prerequisites

- MySQL/MariaDB running with database `cbtgrinder_ajakscbt` (or same name as in `backend/config/connectdb.php`).
- Credentials for that DB (user/password from config or env).
- Node.js and npm installed; dependencies installed (`npm install` already run).

## Step 1: Create mock exam tables

Execute the migration SQL against the project database.

**Option A – mysql CLI (recommended)**

From the project root:

```bash
mysql -h localhost -u YOUR_DB_USER -p cbtgrinder_ajakscbt < backend/mock_exams_tables.sql
```

Replace `YOUR_DB_USER` with the username from `backend/config/connectdb.php` (e.g. `cbtgrinder_johnpaul`). When prompted, enter the DB password. Database name must match config (e.g. `cbtgrinder_ajakscbt`).

**Option B – Explicit database name**

If the database name differs, substitute it:

```bash
mysql -h localhost -u USER -p DATABASE_NAME < backend/mock_exams_tables.sql
```

**Option C – phpMyAdmin or other GUI**

Open `backend/mock_exams_tables.sql`, copy its contents, and run them in the SQL tab of phpMyAdmin (or equivalent) against the correct database.

**Verification:** After running, the following tables must exist: `mock_exams`, `mock_exam_questions`, `mock_exam_attempts`, `mock_exam_answers`. If any CREATE fails, check that `admin`, `study_playlists`, `questions`, and `users` exist and that FKs match your schema.

## Step 2: Start the frontend

From the project root:

```bash
npm run dev
```

This starts the Vite dev server (e.g. http://localhost:5173). Keep this running for local development.

## Summary checklist

1. [ ] Run `backend/mock_exams_tables.sql` against the correct database (mysql CLI, phpMyAdmin, or other).
2. [ ] Confirm the four tables exist: `mock_exams`, `mock_exam_questions`, `mock_exam_attempts`, `mock_exam_answers`.
3. [ ] Run `npm run dev` from the project root to start the frontend.

## Reference

- Table definitions and rationale: `backend/MOCK_EXAMS_DATABASE_ANALYSIS.md`
- Migration file: `backend/mock_exams_tables.sql`
