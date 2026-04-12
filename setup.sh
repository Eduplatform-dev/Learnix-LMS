#!/usr/bin/env bash
# =============================================================
# Learnix — apply ALL fixes
# Run from the PROJECT ROOT:  bash learnix-fixes/setup.sh
# =============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()    { echo -e "${GREEN}  [OK]  $1${NC}"; }
warn()  { echo -e "${YELLOW}  [!!]  $1${NC}"; }
err()   { echo -e "${RED}  [XX]  $1${NC}"; exit 1; }
hdr()   { echo -e "\n${BLUE}── $1 ──────────────────────────────────${NC}"; }

FIXES="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}       Learnix -- Full Fix Script          ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

[ -f "package.json" ] || err "Run from project root (where package.json is)"
[ -d "server" ]       || err "server/ directory not found"

hdr "Environment"
if [ ! -f "server/.env" ]; then
  cp "$FIXES/server/.env.example" server/.env
  warn "Created server/.env  --  EDIT IT: set MONGO_URI and JWT_SECRET"
else ok "server/.env exists"; fi
if [ ! -f ".env" ]; then
  echo "VITE_API_BASE_URL=http://localhost:5000" > .env
  ok "Created root .env"
else ok "Root .env exists"; fi

hdr "File rename"
OLD="server/src/middleware/uploadMIddleware.js"
NEW="server/src/middleware/uploadMiddleware.js"
if [ -f "$OLD" ] && [ ! -f "$NEW" ]; then
  mv "$OLD" "$NEW"; ok "Renamed uploadMIddleware.js -> uploadMiddleware.js"
elif [ -f "$NEW" ]; then ok "uploadMiddleware.js correctly named"; fi

hdr "Applying fixes"
cp_fix(){ local s="$FIXES/$1" d="$1"; [ -f "$s" ] && { mkdir -p "$(dirname "$d")"; cp "$s" "$d"; ok "Updated: $d"; } || warn "Not in package: $1"; }

# Config / server infra
cp_fix server/src/config/env.js
cp_fix server/src/config/db.js
cp_fix server/package.json
cp_fix server/.env.example
cp_fix server/src/scripts/seed.js
cp_fix package.json
cp_fix vite.config.ts
cp_fix .env.example

# Middleware
cp_fix server/src/middleware/auth.js
cp_fix server/src/middleware/errorHandler.js
cp_fix server/src/middleware/uploadMiddleware.js

# Models
cp_fix server/src/models/Submission.js

# Controllers
cp_fix server/src/controllers/authController.js
cp_fix server/src/controllers/contentController.js
cp_fix server/src/controllers/assignmentController.js
cp_fix server/src/controllers/adminController.js
cp_fix server/src/controllers/courseController.js

# Routes
cp_fix server/src/routes/adminRoutes.js
cp_fix server/src/routes/aiRoutes.js
cp_fix server/src/routes/assignmentRoutes.js
cp_fix server/src/routes/contentRoutes.js
cp_fix server/src/routes/courseRoutes.js
cp_fix server/src/routes/feeRoutes.js
cp_fix server/src/routes/submissionRoutes.js
cp_fix server/src/routes/userRoutes.js
cp_fix server/src/routes/authRoutes.js

# Server entry
cp_fix server/src/index.js

# Frontend components
cp_fix src/app/components/pages/student/AIChat.tsx
cp_fix src/app/components/pages/admin/AdminCourses.tsx

# Frontend services — all fixed
cp_fix src/app/services/adminService.ts
cp_fix src/app/services/authService.ts
cp_fix src/app/services/contentService.ts
cp_fix src/app/services/courseService.ts
cp_fix src/app/services/feeService.ts
cp_fix src/app/services/submissionService.ts

# Auth provider
cp_fix src/app/providers/AuthProvider.tsx

# Tests
cp_fix src/test/setup.ts
cp_fix src/test/auth.test.ts
cp_fix src/test/adminService.test.ts
cp_fix src/test/courseService.test.ts
cp_fix src/test/feeService.test.ts
cp_fix src/test/submissionService.test.ts

# CI/CD
mkdir -p .github/workflows
cp_fix .github/workflows/ci.yml

hdr "Cleanup"
for f in "server/src/controllers/aiController.js" "server/src/middleware/uploadMIddleware.js"; do
  [ -f "$f" ] && { rm "$f"; ok "Removed orphan: $f"; }
done

hdr "Dependencies"
npm --prefix server install --silent && ok "Server deps (multer 2.x)"
npm install --silent && ok "Root deps"

hdr "Tests"
npm test -- --run 2>&1 | tail -20 && ok "Tests done" || warn "Some tests failed"

echo ""
read -p "  Seed demo database? (y/N) " s
if [[ "$s" =~ ^[Yy]$ ]]; then
  npm --prefix server run seed && ok "Seeded"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}        All fixes applied!                  ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  1. Edit server/.env  --  set MONGO_URI + JWT_SECRET"
echo "  2. npm run dev:full"
echo "  3. curl http://localhost:5000/health"
echo "  Demo: admin@learnix.com / admin123  |  student@learnix.com / student123"
echo ""
