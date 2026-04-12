# =============================================================
# Learnix — Full Fix Setup Script (Windows PowerShell)
# Run from project root:  .\learnix-fixes\setup.ps1
# =============================================================

$ErrorActionPreference = "Stop"

$GREEN  = "Green"
$YELLOW = "Yellow"
$RED    = "Red"
$CYAN   = "Cyan"

function ok($msg)     { Write-Host "  [OK]  $msg" -ForegroundColor $GREEN }
function warn($msg)   { Write-Host "  [!!]  $msg" -ForegroundColor $YELLOW }
function info($msg)   { Write-Host "  [..]  $msg" -ForegroundColor $CYAN }
function err($msg)    { Write-Host "  [XX]  $msg" -ForegroundColor $RED; exit 1 }
function hdr($msg)    { Write-Host "`n-- $msg " -ForegroundColor $CYAN }

$FIXES = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "       Learnix -- Full Fix Script           " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Guard
if (-not (Test-Path "package.json"))  { err "Run from project root (where package.json is)" }
if (-not (Test-Path "server"))        { err "server/ directory not found" }

# ── 1. ENV FILES ────────────────────────────────────────────
hdr "Environment"

if (-not (Test-Path "server\.env")) {
    Copy-Item "$FIXES\server\.env.example" "server\.env"
    warn "Created server\.env  --  EDIT IT: set MONGO_URI and JWT_SECRET"
} else {
    ok "server\.env exists"
}

if (-not (Test-Path ".env")) {
    Set-Content ".env" "VITE_API_BASE_URL=http://localhost:5000"
    ok "Created root .env"
} else {
    ok "Root .env exists"
}

# ── 2. RENAME MIS-CASED MIDDLEWARE ──────────────────────────
hdr "File rename"

$OLD = "server\src\middleware\uploadMIddleware.js"
$NEW = "server\src\middleware\uploadMiddleware.js"

if ((Test-Path $OLD) -and (-not (Test-Path $NEW))) {
    Rename-Item $OLD "uploadMiddleware.js"
    ok "Renamed uploadMIddleware.js -> uploadMiddleware.js"
} elseif (Test-Path $NEW) {
    ok "uploadMiddleware.js already correctly named"
}

# ── 3. COPY ALL FIXED FILES ──────────────────────────────────
hdr "Applying fixes"

function CopyFix($rel) {
    $src = Join-Path $FIXES $rel
    $dst = $rel
    if (Test-Path $src) {
        $dir = Split-Path $dst -Parent
        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Copy-Item $src $dst -Force
        ok "Updated: $dst"
    } else {
        warn "Not in fixes package: $rel"
    }
}

# Config / infra
CopyFix "server\src\config\env.js"
CopyFix "server\src\config\db.js"
CopyFix "server\package.json"
CopyFix "server\.env.example"
CopyFix "server\src\scripts\seed.js"
CopyFix "package.json"
CopyFix "vite.config.ts"
CopyFix ".env.example"

# Middleware
CopyFix "server\src\middleware\auth.js"
CopyFix "server\src\middleware\errorHandler.js"
CopyFix "server\src\middleware\uploadMiddleware.js"

# Models
CopyFix "server\src\models\Submission.js"

# Controllers
CopyFix "server\src\controllers\contentController.js"
CopyFix "server\src\controllers\assignmentController.js"
CopyFix "server\src\controllers\adminController.js"
CopyFix "server\src\controllers\courseController.js"

# Routes
CopyFix "server\src\routes\adminRoutes.js"
CopyFix "server\src\routes\aiRoutes.js"
CopyFix "server\src\routes\assignmentRoutes.js"
CopyFix "server\src\routes\contentRoutes.js"
CopyFix "server\src\routes\courseRoutes.js"
CopyFix "server\src\routes\feeRoutes.js"
CopyFix "server\src\routes\submissionRoutes.js"
CopyFix "server\src\routes\userRoutes.js"

# Server entry
CopyFix "server\src\index.js"

# Frontend components
CopyFix "src\app\components\pages\student\AIChat.tsx"
CopyFix "src\app\components\pages\admin\AdminCourses.tsx"

# Frontend services
CopyFix "src\app\services\adminService.ts"
CopyFix "src\app\services\authService.ts"
CopyFix "src\app\services\contentService.ts"
CopyFix "src\app\services\courseService.ts"
CopyFix "src\app\services\feeService.ts"
CopyFix "src\app\services\submissionService.ts"

# Providers
CopyFix "src\app\providers\AuthProvider.tsx"

# Tests
CopyFix "src\test\setup.ts"
CopyFix "src\test\auth.test.ts"
CopyFix "src\test\adminService.test.ts"
CopyFix "src\test\courseService.test.ts"
CopyFix "src\test\feeService.test.ts"
CopyFix "src\test\submissionService.test.ts"

# CI/CD
if (-not (Test-Path ".github\workflows")) {
    New-Item -ItemType Directory -Path ".github\workflows" -Force | Out-Null
}
CopyFix ".github\workflows\ci.yml"

# ── 4. REMOVE ORPHANED FILES ─────────────────────────────────
hdr "Cleanup"

$orphans = @(
    "server\src\controllers\aiController.js",
    "server\src\middleware\uploadMIddleware.js"
)
foreach ($f in $orphans) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        ok "Removed orphan: $f"
    }
}

# ── 5. INSTALL DEPENDENCIES ──────────────────────────────────
hdr "Dependencies"

info "Installing server deps (multer 2.x upgrade)..."
Push-Location server
npm install --silent
Pop-Location
ok "Server deps installed"

info "Installing root deps..."
npm install --silent
ok "Root deps installed"

# ── 6. RUN TESTS ─────────────────────────────────────────────
hdr "Tests"

try {
    npm test -- --run
    ok "Tests passed"
} catch {
    warn "Some tests failed -- check output above"
}

# ── 7. OPTIONAL SEED ─────────────────────────────────────────
Write-Host ""
$seed = Read-Host "  Seed demo database? (y/N)"
if ($seed -match "^[Yy]$") {
    Push-Location server
    npm run seed
    Pop-Location
    ok "Database seeded"
}

# ── DONE ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "        All fixes applied!                  " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Edit server\.env -- set MONGO_URI + JWT_SECRET" -ForegroundColor White
Write-Host "  2. (Optional) Add ANTHROPIC_API_KEY to server\.env" -ForegroundColor White
Write-Host "  3. npm run dev:full" -ForegroundColor Cyan
Write-Host "  4. Open http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Demo accounts (after seeding):" -ForegroundColor White
Write-Host "    Admin:   admin@learnix.com   / admin123" -ForegroundColor White
Write-Host "    Student: student@learnix.com / student123" -ForegroundColor White
Write-Host ""
