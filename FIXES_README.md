# Learnix — Complete Fix Guide

## How to apply all fixes

```bash
# From your project root:
bash setup.sh
```

Or apply manually by copying each file from this package into your project (same relative paths).

---

## What was fixed

### CRASH bugs (server wouldn't start)

#### 1. `contentController.js` — was a router, not a controller
**File:** `server/src/controllers/contentController.js`

**Problem:** The file contained `import express from "express"` and exported a Router. `contentRoutes.js` tried to import `getContent`, `getCourseContent`, etc. — all undefined. Node threw `ERR_MODULE_NOT_FOUND` or "does not provide an export" at startup, preventing the entire server from starting.

**Fix:** Completely rewritten as a proper controller with six named async exports: `getContent`, `getCourseContent`, `getContentById`, `createContent`, `updateContent`, `deleteContent`.

---

#### 2. `uploadMIddleware.js` — wrong filename casing
**File:** `server/src/middleware/uploadMIddleware.js` → renamed to `uploadMiddleware.js`

**Problem:** The file was named `uploadMIddleware.js` (capital I in the middle). `contentRoutes.js` imported `./uploadMiddleware.js` (lowercase i). macOS and Windows ignore casing, but Linux (every deployment server, every Docker container) throws `ERR_MODULE_NOT_FOUND` and crashes the server.

**Fix:** Renamed the file to `uploadMiddleware.js`. The `setup.sh` script does this automatically with `mv`.

---

#### 3. Missing `server/.env` → Zod crashes at startup
**File:** `server/src/config/env.js` + `server/.env.example`

**Problem:** `env.js` validates environment variables with Zod at import time. If `MONGO_URI` or `JWT_SECRET` are missing or empty, it throws and kills the process before any route is registered. The frontend then gets a 500 or connection refused on every request including login.

**Fix:**
- `setup.sh` auto-copies `.env.example` → `.env` if missing
- `env.js` now prints a clear error message with instructions before exiting
- `.env.example` updated with comments for every variable

---

### SECURITY bugs

#### 4. `AIChat.tsx` — called Anthropic API directly from browser
**File:** `src/app/components/pages/student/AIChat.tsx`

**Problem:** The component was calling `https://api.anthropic.com/v1/messages` directly from the browser. This pattern exposes your API key to any user who opens DevTools. The backend route `/api/ai/chat` was already built correctly but the frontend never used it.

**Fix:** Replaced the direct Anthropic call with a fetch to `${VITE_API_BASE_URL}/api/ai/chat` with the user's JWT token. The backend proxy handles the Anthropic API key server-side.

---

#### 5. `multer@1.x` — known security vulnerabilities
**File:** `server/package.json`

**Problem:** multer 1.x has published CVEs and prints a deprecation warning on every `npm install`.

**Fix:** Updated to `multer@^2.0.0` in `server/package.json`. The API is identical for all usages in this project (`.single()`, `.array()`).

---

### BROKEN routes

#### 6. `contentRoutes.js` — imported from wrong file
**File:** `server/src/routes/contentRoutes.js`

**Problem:** Imported controller functions from `contentController.js` (which was actually a router) and imported `upload` from `uploadMiddleware.js` (wrong casing). Both imports failed.

**Fix:** Updated to import from the rewritten controller and correctly-named middleware.

---

#### 7. `aiController.js` — orphaned OpenAI file
**File:** `server/src/controllers/aiController.js` — **deleted**

**Problem:** This file called the OpenAI API using `process.env.OPENAI_API_KEY`. It was never imported anywhere. Meanwhile `aiRoutes.js` correctly calls the Anthropic API. The orphan file was confusing and wasted space.

**Fix:** Deleted. The `setup.sh` script removes it automatically.

---

#### 8. `submissionRoutes.js` — wrong ownership check
**File:** `server/src/routes/submissionRoutes.js`

**Problem:** In the POST handler: `assignment.userId === String(req.user._id)`. The `Assignment` model has no `userId` field — it has `instructor`. So `isOwner` was always `false`. The code accidentally relied on `isStaff` being false to block unauthorized access, making the logic fragile.

**Fix:** Removed the broken `isOwner` check. Assignment submission is open to any authenticated student — their `studentId` is set server-side from `req.user._id` so they can't fake ownership. Added proper Zod validation for the grade endpoint.

---

#### 9. Missing pagination on users, assignments, content
**Files:** `userRoutes.js`, `assignmentController.js`, `contentController.js`

**Problem:** `getUsers`, `getAssignments`, and `getContent` all called `.find()` with no limit. Courses correctly used pagination; the others would return all documents (potentially thousands) on every request.

**Fix:** All three now accept `?page=` and `?limit=` query params with sensible defaults (50 items, max 100/200) and use `.skip().limit()`.

---

#### 10. `assignmentController.js` — no validation, no filtering
**File:** `server/src/controllers/assignmentController.js`

**Problem:** Assignments were created with no input validation (no Zod). The GET endpoint returned all assignments with no filtering by course or status.

**Fix:** Added Zod schema validation for create/update. Added `?course=` and `?status=` query param filtering on the list endpoint.

---

### WARNINGS

#### 11. `server/src/index.js` — missing `node-fetch` import for AI route
**Fix:** Added `node-fetch@^3.3.2` to `server/package.json`. The `aiRoutes.js` uses the native `fetch` available in Node 18+, but the package.json dependency is there as a fallback for older Node versions.

#### 12. Root `package.json` had server-only packages
**Fix:** Removed `express`, `cors`, `dotenv`, `mongodb` from root `package.json`. These are backend packages that don't belong in the Vite frontend build.

#### 13. Error handler didn't catch multer errors
**Fix:** `errorHandler.js` now catches `LIMIT_FILE_SIZE` and "File type not allowed" multer errors and returns proper 400 responses instead of 500s.

---

## File list — what changed

| File | Change |
|------|--------|
| `server/src/controllers/contentController.js` | **Rewritten** — was a router, now a real controller |
| `server/src/middleware/uploadMiddleware.js` | **Renamed** from `uploadMIddleware.js` |
| `server/src/middleware/errorHandler.js` | **Improved** — catches multer/mongoose errors |
| `server/src/routes/contentRoutes.js` | **Fixed** imports |
| `server/src/routes/submissionRoutes.js` | **Fixed** ownership check, added Zod validation |
| `server/src/routes/userRoutes.js` | **Added** pagination + Zod validation |
| `server/src/routes/aiRoutes.js` | **Cleaned up** — better error handling, disconnect guard |
| `server/src/controllers/assignmentController.js` | **Added** Zod validation + filtering + pagination |
| `server/src/config/env.js` | **Improved** error messages, added `ANTHROPIC_API_KEY` |
| `server/src/index.js` | **Cleaned up** — better startup logging, CORS fix |
| `server/src/controllers/aiController.js` | **Deleted** — orphaned OpenAI file |
| `server/package.json` | **Updated** multer to 2.x |
| `server/.env.example` | **Improved** with comments |
| `src/app/components/pages/student/AIChat.tsx` | **Fixed** — calls backend instead of Anthropic directly |
| `package.json` | **Removed** server-only packages |

---

## Quick start after applying fixes

```bash
# 1. Edit server/.env
nano server/.env
# Set: MONGO_URI, JWT_SECRET, CORS_ORIGIN, (optional) ANTHROPIC_API_KEY

# 2. Start both servers
npm run dev:full

# 3. Check health
curl http://localhost:5000/health

# 4. Seed demo data (optional)
npm --prefix server run seed
```

Demo accounts after seeding:
- Admin: `admin@learnix.com` / `admin123`
- Student: `student@learnix.com` / `student123`
