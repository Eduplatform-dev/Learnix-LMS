import express from "express";
import { z } from "zod";
import Result from "../models/Result.js";
import AuditLog from "../models/AuditLog.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const subjectSchema = z.object({
  subject:       z.string().min(1).max(100).trim(),
  subjectCode:   z.string().max(20).optional().default(""),
  internalMarks: z.coerce.number().min(0).max(100).default(0),
  externalMarks: z.coerce.number().min(0).max(100).default(0),
  totalMarks:    z.coerce.number().min(0).max(200).default(0),
  maxMarks:      z.coerce.number().min(1).max(200).default(100),
  grade:         z.string().max(5).optional().default(""),
  gradePoints:   z.coerce.number().min(0).max(10).optional().default(0),
  credits:       z.coerce.number().min(0).max(10).optional().default(3),
  status:        z.enum(["pass","fail","absent","detained"]).optional().default("pass"),
});

const resultSchema = z.object({
  student:            z.string().min(1),
  department:         z.string().optional().nullable().default(null),
  academicYear:       z.string().min(1),
  semesterNumber:     z.coerce.number().int().min(1).max(8),
  enrollmentNumber:   z.string().max(30).optional().default(""),
  subjects:           z.array(subjectSchema).min(1),
  sgpa:               z.coerce.number().min(0).max(10).optional().default(0),
  cgpa:               z.coerce.number().min(0).max(10).optional().default(0),
  result:             z.enum(["pass","fail","distinction","first_class","second_class","pass_class","atkt","detained"]).optional().default("pass"),
  rank:               z.coerce.number().int().min(1).optional().nullable().default(null),
  remarks:            z.string().max(500).optional().default(""),
  declaredOn:         z.string().optional().nullable().default(null),
  isPublished:        z.boolean().optional().default(false),
});

function computeAggregates(subjects) {
  const totalObtained = subjects.reduce((s, sub) => s + (sub.totalMarks || 0), 0);
  const totalMax      = subjects.reduce((s, sub) => s + (sub.maxMarks  || 100), 0);
  const totalCredits  = subjects.reduce((s, sub) => s + (sub.credits   || 3), 0);
  const earnedCredits = subjects
    .filter(s => s.status === "pass")
    .reduce((s, sub) => s + (sub.credits || 3), 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 10) / 10 : 0;
  return { totalMarksObtained: totalObtained, totalMaxMarks: totalMax, percentage, totalCredits, earnedCredits };
}

// FIX: /my MUST come before /:id — otherwise "my" is treated as an id
// GET my results (student)
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const results = await Result.find({ student: req.user._id, isPublished: true })
      .populate("department", "name code")
      .sort({ semesterNumber: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all results (admin/instructor) — also before /:id
router.get("/", authenticateToken, authorize(["admin", "instructor"]), async (req, res) => {
  try {
    const filter = {};
    if (req.query.department)     filter.department     = req.query.department;
    if (req.query.semesterNumber) filter.semesterNumber = Number(req.query.semesterNumber);
    if (req.query.academicYear)   filter.academicYear   = req.query.academicYear;
    if (req.query.student)        filter.student        = req.query.student;
    if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === "true";

    const results = await Result.find(filter)
      .populate("student", "username email")
      .populate("department", "name code")
      .sort({ semesterNumber: 1, createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single result by ID — after /my and /
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate("student", "username email")
      .populate("department", "name code");
    if (!result) return res.status(404).json({ error: "Result not found" });

    if (req.user.role === "student" && String(result.student._id) !== String(req.user._id)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (req.user.role === "student" && !result.isPublished) {
      return res.status(404).json({ error: "Result not published yet" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE result (admin only)
router.post("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const parsed = resultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const aggregates = computeAggregates(parsed.data.subjects);

    const result = await Result.create({
      ...parsed.data,
      ...aggregates,
      declaredOn: parsed.data.declaredOn ? new Date(parsed.data.declaredOn) : null,
      createdBy: req.user._id,
    });

    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: "CREATE_RESULT", resource: "result", resourceId: String(result._id),
      details: `Created result for student ${parsed.data.student} Sem ${parsed.data.semesterNumber}`,
      status: "success",
    }).catch(() => {});

    res.status(201).json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Result already exists for this student/semester/year" });
    res.status(500).json({ error: err.message });
  }
});

// UPDATE result (admin)
router.put("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const parsed = resultSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const updates = { ...parsed.data };
    if (updates.subjects) Object.assign(updates, computeAggregates(updates.subjects));
    if (updates.declaredOn) updates.declaredOn = new Date(updates.declaredOn);

    const result = await Result.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!result) return res.status(404).json({ error: "Result not found" });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLISH/UNPUBLISH result (admin)
router.patch("/:id/publish", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const { isPublished } = req.body;
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { isPublished: !!isPublished, declaredOn: isPublished ? new Date() : null },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: "Result not found" });

    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: isPublished ? "PUBLISH_RESULT" : "UNPUBLISH_RESULT", resource: "result",
      resourceId: String(result._id), details: `Result ${isPublished ? "published" : "unpublished"}`,
      status: "success",
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE result (admin)
router.delete("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Result not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;