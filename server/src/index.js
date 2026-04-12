import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";

import { connectDB }       from "./config/db.js";
import { corsOrigins, env } from "./config/env.js";

/* ── Existing routes ── */
import authRoutes           from "./routes/authRoutes.js";
import userRoutes           from "./routes/userRoutes.js";
import adminRoutes          from "./routes/adminRoutes.js";
import courseRoutes         from "./routes/courseRoutes.js";
import assignmentRoutes     from "./routes/assignmentRoutes.js";
import contentRoutes        from "./routes/contentRoutes.js";
import submissionRoutes     from "./routes/submissionRoutes.js";
import feeRoutes            from "./routes/feeRoutes.js";
import aiRoutes             from "./routes/aiRoutes.js";
import lessonRoutes         from "./routes/lessonRoutes.js";
import departmentRoutes     from "./routes/departmentRoutes.js";
import semesterRoutes       from "./routes/semesterRoutes.js";
import profileRoutes        from "./routes/profileRoutes.js";
import notificationRoutes   from "./routes/notificationRoutes.js";

/* ── NEW routes ── */
import examRoutes           from "./routes/examRoutes.js";
import resultRoutes         from "./routes/resultRoutes.js";
import discussionRoutes     from "./routes/discussionRoutes.js";
import attendanceRoutes     from "./routes/attendanceRoutes.js";
import timetableRoutes      from "./routes/timetableRoutes.js";
import documentRoutes       from "./routes/documentRoutes.js";
import academicYearRoutes   from "./routes/academicYearRoutes.js"; // FIX: was missing
import { certRouter, auditRouter } from "./routes/certAndAuditRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app  = express();
const PORT = env.PORT;

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

/* ─── GLOBAL MIDDLEWARE ─────────────────────────────── */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        frameAncestors: ["'self'", "http://localhost:5173"],
      },
    },
  })
);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

/* ─── RATE LIMITING ─────────────────────────────────── */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === "production" ? 80 : 500,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests, please slow down." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 20 : 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many auth attempts, try again in 15 minutes." },
});

app.use("/api", globalLimiter);

/* ─── STATIC UPLOADS ────────────────────────────────── */
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

/* ─── ROUTES ─────────────────────────────────────────── */
app.use("/api/auth",           authLimiter, authRoutes);
app.use("/api/users",          userRoutes);
app.use("/api/admin",          adminRoutes);
app.use("/api/courses",        courseRoutes);
app.use("/api/assignments",    assignmentRoutes);
app.use("/api/content",        contentRoutes);
app.use("/api/submissions",    submissionRoutes);
app.use("/api/fees",           feeRoutes);
app.use("/api/ai",             aiRoutes);
app.use("/api/lessons",        lessonRoutes);
app.use("/api/departments",    departmentRoutes);
app.use("/api/semesters",      semesterRoutes);
app.use("/api/profiles",       profileRoutes);
app.use("/api/notifications",  notificationRoutes);

/* New */
app.use("/api/exams",          examRoutes);
app.use("/api/results",        resultRoutes);
app.use("/api/discussions",    discussionRoutes);
app.use("/api/attendance",     attendanceRoutes);
app.use("/api/timetable",      timetableRoutes);
app.use("/api/documents",      documentRoutes);
app.use("/api/academic-years", academicYearRoutes); // FIX: was missing
app.use("/api/certificates",   certRouter);
app.use("/api/audit-logs",     auditRouter);

/* ─── HEALTH ─────────────────────────────────────────── */
app.get("/health", (_req, res) => {
  const aiProvider =
    process.env.GEMINI_API_KEY    ? "gemini"    :
    process.env.ANTHROPIC_API_KEY ? "anthropic" :
    "none";

  res.json({
    ok:          true,
    env:         env.NODE_ENV,
    ai:          aiProvider !== "none",
    ai_provider: aiProvider,
    timestamp:   new Date().toISOString(),
    features: {
      exams:           true,
      results:         true,
      discussions:     true,
      certificates:    true,
      auditLogs:       true,
      darkMode:        true,
      enrollmentLogin: true,
      academicYears:   true,
    },
  });
});

/* ─── ERRORS ─────────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ─── START ──────────────────────────────────────────── */
async function start() {
  try {
    await connectDB();

    const aiStatus =
      process.env.GEMINI_API_KEY    ? "Google Gemini (configured)" :
      process.env.ANTHROPIC_API_KEY ? "Anthropic Claude (configured)" :
      "⚠️  No AI key set";

    app.listen(PORT, () => {
      console.log(`\n✅  Server running on http://localhost:${PORT}`);
      console.log(`   Mode:  ${env.NODE_ENV}`);
      console.log(`   CORS:  ${corsOrigins.join(", ")}`);
      console.log(`   AI:    ${aiStatus}`);
      console.log(`\n   Routes:`);
      console.log(`   ✓ Academic Years     → /api/academic-years`);
      console.log(`   ✓ Exam scheduling    → /api/exams`);
      console.log(`   ✓ Results/Marksheets → /api/results`);
      console.log(`   ✓ Discussion forums  → /api/discussions`);
      console.log(`   ✓ Certificates       → /api/certificates`);
      console.log(`   ✓ Audit logs         → /api/audit-logs`);
      console.log(`   ✓ Enrollment login   → /api/auth/login (enrollmentNumber)\n`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();