import express from "express";
import { z } from "zod";
import Department from "../models/Department.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const deptSchema = z.object({
  name:        z.string().min(2).max(100).trim(),
  code:        z.string().min(2).max(10).trim(),
  description: z.string().max(500).optional().default(""),
});

/* ─── GET ALL (active only) ───────────────────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    // FIX: removed .populate("hod") / .populate("hodId") — Department model
    // no longer has that field, so populate() would silently return nothing
    // or throw depending on Mongoose version.
    const depts = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET BY ID ───────────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    // FIX: no populate needed
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── CREATE (admin only) ─────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = deptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const dept = await Department.create(parsed.data);
      res.status(201).json(dept);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Department name or code already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── UPDATE (admin only) ─────────────────────────────── */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = deptSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const dept = await Department.findByIdAndUpdate(
        req.params.id,
        parsed.data,
        { new: true, runValidators: true }
      );
      if (!dept) return res.status(404).json({ error: "Department not found" });
      res.json(dept);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Department name or code already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── DELETE / deactivate (admin only) ───────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const dept = await Department.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      if (!dept) return res.status(404).json({ error: "Department not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;