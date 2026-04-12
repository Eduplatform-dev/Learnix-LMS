import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import mongoose from "mongoose";

import { authenticateToken, authorize } from "../middleware/auth.js";
import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";
import { env } from "../config/env.js";

const router = express.Router();

/* ─── FILE UPLOAD SETUP ─────────────────────────────── */
const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error("File type not allowed")),
});

const gradeSchema = z.object({
  grade:    z.string().min(1).max(50).trim(),
  feedback: z.string().max(2000).optional().default(""),
});

const baseUrl = (req) =>
  env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

const isStaff = (user) => ["admin", "instructor"].includes(user.role);

/* ─── GET ALL SUBMISSIONS ─────────────────────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    let filter = {};

    if (req.user.role === "student") {
      // Students see only their own submissions
      filter.studentId = req.user._id;
    } else if (req.user.role === "instructor") {
      // Instructors see submissions for their assignments
      const myAssignments = await Assignment.find({ instructor: req.user._id }).select("_id");
      const myAssignmentIds = myAssignments.map((a) => a._id);
      filter.assignmentId = { $in: myAssignmentIds };
    }
    // Admin sees all

    if (req.query.status)       filter.status       = req.query.status;
    if (req.query.assignmentId) filter.assignmentId = req.query.assignmentId;

    const [submissions, total] = await Promise.all([
      Submission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Submission.countDocuments(filter),
    ]);

    res.json(submissions);
  } catch (err) {
    console.error("getSubmissions error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET BY ASSIGNMENT ───────────────────────────────── */
router.get("/assignment/:assignmentId", authenticateToken, async (req, res) => {
  try {
    const filter = isStaff(req.user)
      ? { assignmentId: req.params.assignmentId }
      : { assignmentId: req.params.assignmentId, studentId: req.user._id };

    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).lean();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET SINGLE ──────────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ error: "Submission not found" });

    const isOwner = String(sub.studentId) === String(req.user._id);
    if (!isOwner && !isStaff(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── CREATE / SAVE DRAFT ─────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const { assignmentId, title, description, text, status } = req.body || {};

      if (!assignmentId) {
        return res.status(400).json({ error: "assignmentId is required" });
      }

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const files = (req.files || []).map((f) => ({
        originalName: f.originalname,
        filename:     f.filename,
        url:          `${baseUrl(req)}/uploads/${f.filename}`,
        size:         f.size,
      }));

      const submissionStatus = status === "submitted" ? "submitted" : "draft";

      const sub = await Submission.create({
        assignmentId,
        assignmentTitle: assignment.title,
        course:      String(assignment.course || ""),
        studentId:   req.user._id,
        studentName: req.user.username || req.user.email,
        title:       String(title || "").trim(),
        description: String(description || "").trim(),
        text:        String(text || "").trim(),
        files,
        status: submissionStatus,
      });

      if (submissionStatus === "submitted") {
        await Assignment.findByIdAndUpdate(assignmentId, { status: "Submitted" });
      }

      res.status(201).json(sub);
    } catch (err) {
      console.error("createSubmission error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── UPDATE SUBMISSION ───────────────────────────────── */
router.put(
  "/:id",
  authenticateToken,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const sub = await Submission.findById(req.params.id);
      if (!sub) return res.status(404).json({ error: "Submission not found" });

      const isOwner = String(sub.studentId) === String(req.user._id);
      if (!isOwner && !isStaff(req.user)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (isOwner && !isStaff(req.user) && sub.status !== "draft") {
        return res.status(400).json({ error: "Cannot edit a submitted submission" });
      }

      if (req.body?.title       !== undefined) sub.title       = String(req.body.title).trim();
      if (req.body?.description !== undefined) sub.description = String(req.body.description).trim();
      if (req.body?.text        !== undefined) sub.text        = String(req.body.text).trim();

      const newFiles = (req.files || []).map((f) => ({
        originalName: f.originalname,
        filename:     f.filename,
        url:          `${baseUrl(req)}/uploads/${f.filename}`,
        size:         f.size,
      }));
      sub.files.push(...newFiles);

      if (req.body?.status === "submitted") {
        sub.status = "submitted";
        await Assignment.findByIdAndUpdate(sub.assignmentId, { status: "Submitted" });
      }

      await sub.save();
      res.json(sub);
    } catch (err) {
      console.error("updateSubmission error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── GRADE ───────────────────────────────────────────── */
router.patch(
  "/:id/grade",
  authenticateToken,
  authorize(["admin", "instructor"]),
  async (req, res) => {
    try {
      const parsed = gradeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const sub = await Submission.findById(req.params.id);
      if (!sub) return res.status(404).json({ error: "Submission not found" });

      // Instructors can only grade submissions for their own assignments
      if (req.user.role === "instructor") {
        const assignment = await Assignment.findById(sub.assignmentId);
        if (!assignment || String(assignment.instructor) !== String(req.user._id)) {
          return res.status(403).json({ error: "You can only grade submissions for your assignments" });
        }
      }

      sub.grade    = parsed.data.grade;
      sub.feedback = parsed.data.feedback;
      sub.status   = "graded";
      sub.gradedAt = new Date();
      sub.gradedBy = req.user._id;

      await sub.save();
      res.json(sub);
    } catch (err) {
      console.error("gradeSubmission error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── DELETE ──────────────────────────────────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const sub = await Submission.findById(req.params.id);
      if (!sub) return res.status(404).json({ error: "Submission not found" });

      for (const file of sub.files) {
        const fp = path.join(uploadDir, file.filename);
        try {
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch { /* ignore */ }
      }

      await sub.deleteOne();
      res.json({ ok: true });
    } catch (err) {
      console.error("deleteSubmission error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;