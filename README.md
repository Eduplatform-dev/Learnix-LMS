# Learnix LMS — Complete Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas free tier)
- Git

---

## 1. Environment Setup

```bash
# Copy env files
cp server/.env.example server/.env

# Edit server/.env — fill in these required values:
# MONGO_URI=mongodb://localhost:27017/learnix
# JWT_SECRET=your-very-long-random-secret-at-least-16-chars
```

---

## 2. Free AI Integration — Google Gemini

The app uses **Google Gemini 1.5 Flash** (FREE tier: 1,500 requests/day).

### Get your free Gemini API key:
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### Add to server/.env:
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

**That's it!** The AI assistant will now work for free.

> If you also have an Anthropic key, add `ANTHROPIC_API_KEY=` and Claude will be used instead.

---

## 3. Install & Run

```bash
# Install all dependencies
npm install
npm --prefix server install

# Start both frontend + backend
npm run dev:full

# Or start separately:
npm run dev          # Frontend on http://localhost:5173
npm run dev:server   # Backend on http://localhost:5000
```

---

## 4. Seed Demo Data

```bash
npm --prefix server run seed
```

**Demo accounts:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@learnix.com | admin123 |
| Instructor | instructor@learnix.com | instructor123 |
| Student | student@learnix.com | student123 |

> **Note:** The seed script creates an instructor account too. If it's not there, register with role "instructor" at signup.

---

## 5. Three User Roles

### 🎓 Student (`/dashboard`)
- View enrolled courses, videos, resources
- Submit assignments with file uploads
- Track progress with charts
- Pay fees (simulated)
- AI study assistant (Gemini-powered)

### 👩‍🏫 Instructor (`/instructor`)
- Dashboard with submission analytics
- Create/manage courses
- Post assignments with deadlines
- Grade student submissions
- Manage course content (upload videos, PDFs, images)
- View enrolled students

### 🛡 Admin (`/admin`)
- Full user management (CRUD)
- Platform analytics and charts
- Course management
- Fee tracking and management
- All submissions overview
- System settings

---

## 6. Deploy to Production

### Option A: Deploy to Render (Free)

**Backend:**
1. Create account at https://render.com
2. New Web Service → connect your GitHub repo
3. Build command: `npm install`
4. Start command: `node server/src/index.js`
5. Add environment variables from `server/.env`

**Frontend:**
1. New Static Site → same repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

### Option B: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option C: Deploy to Vercel (Frontend) + Railway (Backend)

Frontend → Vercel (free, instant)
Backend → Railway (free tier: 500 hours/month)

---

## 7. MongoDB Atlas (Free Cloud DB)

1. Go to https://cloud.mongodb.com
2. Create free M0 cluster
3. Get connection string
4. Update `MONGO_URI` in `.env`:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/learnix
```

---

## 8. Project Structure

```
learnix/
├── src/                          # Frontend (React + TypeScript)
│   ├── App.tsx                   # Route definitions (all 3 roles)
│   ├── app/
│   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── student/      # 9 student pages
│   │   │   │   ├── admin/        # 8 admin pages
│   │   │   │   └── instructor/   # 6 instructor pages ✨ NEW
│   │   │   ├── Sidebar.tsx       # Role-aware navigation
│   │   │   └── Header.tsx
│   │   ├── services/             # API service layer
│   │   └── providers/            # Auth context
│   └── styles/
├── server/                       # Backend (Node.js + Express)
│   └── src/
│       ├── controllers/          # Business logic
│       ├── routes/               # API endpoints
│       ├── models/               # Mongoose schemas
│       ├── middleware/           # Auth, errors, uploads
│       └── config/               # DB, env validation
└── README.md
```

---

## 9. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | None | Register user |
| POST | /api/auth/login | None | Login |
| GET | /api/courses | Required | List courses |
| POST | /api/courses | Admin | Create course |
| GET | /api/assignments | Required | List assignments |
| POST | /api/assignments | Instructor/Admin | Create assignment |
| GET | /api/submissions | Required | List submissions |
| POST | /api/submissions | Student | Submit work |
| PATCH | /api/submissions/:id/grade | Instructor/Admin | Grade |
| POST | /api/ai/chat | Required | AI chat (Gemini/Claude) |
| GET | /api/fees/my | Student | My fees |
| GET | /api/admin/dashboard | Admin | Dashboard stats |
| GET | /health | None | Health check |

---

## 10. Features Checklist

- [x] Authentication (JWT, role-based)
- [x] Student portal (9 pages)
- [x] Admin portal (8 pages)
- [x] Instructor portal (6 pages) ✨
- [x] AI Chat (Google Gemini FREE / Anthropic Claude)
- [x] File uploads (multer)
- [x] Assignment submission with files
- [x] Grading system
- [x] Fee management
- [x] Analytics with charts (Recharts)
- [x] Responsive design (Tailwind)
- [x] Input validation (Zod)
- [x] Rate limiting
- [x] Security headers (Helmet)
- [x] Pagination on all list endpoints
- [x] CI/CD pipeline (GitHub Actions)
- [x] Deployment guide

---

## Troubleshooting

### Server won't start
```bash
# Check if .env exists
ls server/.env

# If not, create it:
cp server/.env.example server/.env
# Then edit MONGO_URI and JWT_SECRET
```

### AI not working
- Make sure `GEMINI_API_KEY` is set in `server/.env`
- Get free key at: https://aistudio.google.com/app/apikey
- Check `/health` endpoint: `curl http://localhost:5000/health`

### MongoDB connection error
- Make sure MongoDB is running: `mongod`
- Or use MongoDB Atlas (cloud, free)

### File uploads not working
- Check that `server/uploads/` directory exists (auto-created)
- File size limit: 50MB per file