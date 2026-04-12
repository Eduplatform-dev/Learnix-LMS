import express from "express";
import { z } from "zod";
import Exam from "../models/Exam.js";
import AuditLog from "../models/AuditLog.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const examSchema = z.object({
  title:          z.string().min(1).max(200).trim(),
  subject:        z.string().min(1).max(100).trim(),
  subjectCode:    z.string().max(20).optional().default(""),
  course:         z.string().optional().nullable().default(null),
  department:     z.string().optional().nullable().default(null),
  semesterNumber: z.coerce.number().int().min(1).max(8).optional().nullable().default(null),
  examDate:       z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date"),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime:        z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  duration:       z.coerce.number().int().min(15).max(480).optional().default(180),
  room:           z.string().max(50).optional().default(""),
  building:       z.string().max(100).optional().default(""),
  totalMarks:     z.coerce.number().int().min(1).optional().default(100),
  passingMarks:   z.coerce.number().int().min(0).optional().default(40),
  examType:       z.enum(["midterm","final","unit_test","practical","viva","internal"]).optional().default("midterm"),
  instructions:   z.string().max(2000).optional().default(""),
  invigilators:   z.array(z.string()).optional().default([]),
});

// GET all exams
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department)     filter.department     = req.query.department;
    if (req.query.semesterNumber) filter.semesterNumber = Number(req.query.semesterNumber);
    if (req.query.status)         filter.status         = req.query.status;
    if (req.query.examType)       filter.examType       = req.query.examType;

    // Date range
    if (req.query.from || req.query.to) {
      filter.examDate = {};
      if (req.query.from) filter.examDate.$gte = new Date(req.query.from);
      if (req.query.to)   filter.examDate.$lte = new Date(req.query.to);
    }

    const exams = await Exam.find(filter)
      .populate("department", "name code")
      .populate("course", "title")
      .populate("invigilators", "username email")
      .sort({ examDate: 1, startTime: 1 });

    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single exam
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("department", "name code")
      .populate("course", "title")
      .populate("invigilators", "username email");
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE exam (admin only)
router.post("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const parsed = examSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const exam = await Exam.create({
      ...parsed.data,
      examDate: new Date(parsed.data.examDate),
      createdBy: req.user._id,
    });

    // Audit log
    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: "CREATE_EXAM", resource: "exam", resourceId: String(exam._id),
      details: `Created exam: ${exam.title} on ${exam.examDate.toLocaleDateString()}`,
      status: "success",
    }).catch(() => {});

    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE exam (admin only)
router.put("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const parsed = examSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const updates = { ...parsed.data };
    if (updates.examDate) updates.examDate = new Date(updates.examDate);

    const exam = await Exam.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: "UPDATE_EXAM", resource: "exam", resourceId: String(exam._id),
      details: `Updated exam: ${exam.title}`, status: "success",
    }).catch(() => {});

    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE exam (admin only)
router.delete("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    await AuditLog.create({
      actor: req.user._id, actorEmail: req.user.email, actorRole: req.user.role,
      action: "DELETE_EXAM", resource: "exam", resourceId: String(exam._id),
      details: `Deleted exam: ${exam.title}`, status: "success",
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
