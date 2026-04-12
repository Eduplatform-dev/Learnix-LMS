import express from "express";
import Certificate from "../models/Certificate.js";
import AuditLog from "../models/AuditLog.js";
import Progress from "../models/Progress.js";
import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const certRouter = express.Router();
const auditRouter = express.Router();

// ─── CERTIFICATES ─────────────────────────────────────────────

// GET my certificates (student)
certRouter.get("/my", authenticateToken, async (req, res) => {
  try {
    const certs = await Certificate.find({ student: req.user._id })
      .populate("course", "title instructor duration")
      .sort({ issuedAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all certificates (admin)
certRouter.get("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const certs = await Certificate.find()
      .populate("student", "username email")
      .populate("course", "title")
      .sort({ issuedAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY certificate by ID (public)
certRouter.get("/verify/:certId", async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateId: req.params.certId })
      .populate("student", "username")
      .populate("course", "title duration");
    if (!cert) return res.status(404).json({ error: "Certificate not found or invalid" });
    res.json({
      valid: true,
      studentName: cert.studentName,
      courseName: cert.courseName,
      completionDate: cert.completionDate,
      certificateId: cert.certificateId,
      issuedAt: cert.issuedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GENERATE certificate (auto-check progress or admin force-issue)
certRouter.post("/generate/:courseId", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.role === "admin" && req.body.studentId
      ? req.body.studentId
      : req.user._id;

    // Check if already issued
    const existing = await Certificate.findOne({ student: studentId, course: courseId });
    if (existing) return res.json(existing);

    // Check progress
    const [progress, totalLessons] = await Promise.all([
      Progress.findOne({ student: studentId, course: courseId }),
      Lesson.countDocuments({ course: courseId }),
    ]);

    const completedCount = progress?.completedLessons?.length || 0;
    const isComplete = totalLessons > 0 && completedCount >= totalLessons;

    if (!isComplete && req.user.role !== "admin") {
      return res.status(400).json({
        error: `Course not complete. ${completedCount}/${totalLessons} lessons done.`,
      });
    }

    const course   = await Course.findById(courseId).populate("instructor", "username");
    const student  = await User.findById(studentId);
    const profile  = await StudentProfile.findOne({ user: studentId });

    if (!course || !student) return res.status(404).json({ error: "Course or student not found" });

    const cert = await Certificate.create({
      student: studentId,
      course: courseId,
      studentName: profile?.fullName || student.username,
      courseName: course.title,
      instructorName: course.instructor?.username || "",
      completionDate: progress?.completedAt || new Date(),
      grade: req.body.grade || "",
      percentage: req.body.percentage || null,
    });

    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: "ISSUE_CERTIFICATE", resource: "certificate", resourceId: String(cert._id),
      details: `Certificate issued for ${student.username} — ${course.title}`, status: "success",
    }).catch(() => {});

    res.status(201).json(cert);
  } catch (err) {
    if (err.code === 11000) {
      const cert = await Certificate.findOne({ student: req.user._id, course: req.params.courseId });
      return res.json(cert);
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── AUDIT LOGS ───────────────────────────────────────────────

auditRouter.get("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.action)   filter.action   = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.actor)    filter.actor    = req.query.actor;
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "username email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { certRouter, auditRouter };
