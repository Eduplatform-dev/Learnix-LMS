import express from "express";
import { z } from "zod";
import Semester from "../models/Semester.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const semSchema = z.object({
  name:         z.string().min(1).max(50).trim(),
  academicYear: z.string().min(4).max(10).trim(),
  department:   z.string().min(1),
  startDate:    z.string().refine(d => !isNaN(Date.parse(d)), "Invalid start date"),
  endDate:      z.string().refine(d => !isNaN(Date.parse(d)), "Invalid end date"),
  isActive:     z.boolean().optional().default(false),
});

/* ─── GET ALL (optionally by department) ──────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const semesters = await Semester.find(filter)
      .populate("department", "name code")
      .sort({ academicYear: -1, name: 1 });
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── CREATE (admin) ──────────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = semSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { startDate, endDate, ...rest } = parsed.data;
      const sem = await Semester.create({
        ...rest,
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
      });
      res.status(201).json(sem);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Semester already exists for this department and year" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── UPDATE (admin) ──────────────────────────────────── */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = semSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const updates = { ...parsed.data };
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate)   updates.endDate   = new Date(updates.endDate);

      const sem = await Semester.findByIdAndUpdate(req.params.id, updates, { new: true });
      if (!sem) return res.status(404).json({ error: "Semester not found" });
      res.json(sem);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── DELETE (admin) ──────────────────────────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const sem = await Semester.findByIdAndDelete(req.params.id);
      if (!sem) return res.status(404).json({ error: "Semester not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
