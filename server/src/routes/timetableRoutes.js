import express from "express";
import { z } from "zod";
import Timetable from "../models/Timetable.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const slotSchema = z.object({
  day:         z.enum(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/),
  subject:     z.string().min(1).max(100).trim(),
  subjectCode: z.string().max(20).optional().default(""),
  instructor:  z.string().optional().nullable().default(null),
  room:        z.string().max(50).optional().default(""),
  type:        z.enum(["lecture","lab","tutorial","break","free"]).default("lecture"),
  color:       z.string().optional().default("#6366f1"),
});

const timetableSchema = z.object({
  department:   z.string().min(1),
  year:         z.coerce.number().int().min(1).max(6),
  division:     z.string().max(10).optional().default("A"),
  academicYear: z.string().min(4).max(10),
  semester:     z.coerce.number().int().min(1).max(8),
  slots:        z.array(slotSchema).default([]),
  isPublished:  z.boolean().optional().default(false),
});

/* ── GET timetable (student/instructor) ───────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department)   filter.department   = req.query.department;
    if (req.query.year)         filter.year         = Number(req.query.year);
    if (req.query.division)     filter.division     = req.query.division;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.semester)     filter.semester     = Number(req.query.semester);

    // Students/instructors only see published ones
    if (req.user.role === "student") filter.isPublished = true;

    const timetables = await Timetable.find(filter)
      .populate("department", "name code")
      .populate("slots.instructor", "username")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json(timetables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET single by ID ─────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const tt = await Timetable.findById(req.params.id)
      .populate("department", "name code")
      .populate("slots.instructor", "username email");
    if (!tt) return res.status(404).json({ error: "Timetable not found" });
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST: create timetable (admin) ───────────────────── */
router.post("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const parsed = timetableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { department, year, division, academicYear, semester, slots, isPublished } = parsed.data;

    // Upsert
    const existing = await Timetable.findOne({ department, year, division, academicYear, semester });
    if (existing) {
      existing.slots       = slots;
      existing.isPublished = isPublished;
      await existing.save();
      return res.json(existing);
    }

    const tt = await Timetable.create({
      department, year, division, academicYear, semester, slots, isPublished,
      createdBy: req.user._id,
    });
    res.status(201).json(tt);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Timetable already exists" });
    res.status(500).json({ error: err.message });
  }
});

/* ── PUT: update slots ────────────────────────────────── */
router.put("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const updates = {};
    if (req.body.slots !== undefined)       updates.slots       = req.body.slots;
    if (req.body.isPublished !== undefined)  updates.isPublished = req.body.isPublished;

    const tt = await Timetable.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("department", "name code")
      .populate("slots.instructor", "username");
    if (!tt) return res.status(404).json({ error: "Timetable not found" });
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH: publish/unpublish ─────────────────────────── */
router.patch("/:id/publish", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const tt = await Timetable.findByIdAndUpdate(
      req.params.id,
      { isPublished: req.body.isPublished },
      { new: true }
    );
    if (!tt) return res.status(404).json({ error: "Timetable not found" });
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE ───────────────────────────────────────────── */
router.delete("/:id", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
