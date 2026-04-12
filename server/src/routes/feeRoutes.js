import express from "express";
import { z } from "zod";
import { authenticateToken, authorize } from "../middleware/auth.js";
import Fee from "../models/Fee.js";

const router = express.Router();

const createFeeSchema = z.object({
  studentId:   z.string().min(1, "studentId is required"),
  description: z.string().min(1).max(200).trim(),
  amount:      z.coerce.number().positive("Amount must be positive"),
  dueDate:     z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid due date"),
  status:      z.enum(["paid", "pending", "overdue"]).optional().default("pending"),
  invoice:     z.string().optional().default(""),
  semester:    z.string().optional().default(""),
  category:    z.enum(["tuition", "lab", "technology", "certification", "other"]).optional().default("tuition"),
});

/* ─── GET MY FEES (student) ───────────────────────────── */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.user._id }).sort({ dueDate: 1 });

    const totalPaid    = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
    const totalPending = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
    const nextFee      = fees.find((f) => f.status === "pending") ?? null;

    res.json({ fees, totalPaid, totalPending, nextFee });
  } catch (err) {
    console.error("getMyFees error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET ALL FEES (admin) ────────────────────────────── */
router.get(
  "/",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
      const skip  = (page - 1) * limit;

      const filter = {};
      if (req.query.status)    filter.status    = req.query.status;
      if (req.query.studentId) filter.student   = req.query.studentId;
      if (req.query.category)  filter.category  = req.query.category;

      const [fees, total] = await Promise.all([
        Fee.find(filter)
          .populate("student", "username email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Fee.countDocuments(filter),
      ]);

      const totalRevenue  = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
      const pendingAmount = fees.filter((f) => f.status === "pending").reduce((s, f) => s + f.amount, 0);

      res.json({ fees, totalRevenue, pendingPayments: pendingAmount, total, page });
    } catch (err) {
      console.error("getAllFees error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── CREATE FEE (admin) ──────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = createFeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { studentId, ...rest } = parsed.data;
      const count   = await Fee.countDocuments();
      const invoice = rest.invoice || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      const fee = await Fee.create({
        student: studentId,
        ...rest,
        dueDate: new Date(rest.dueDate),
        invoice,
      });

      res.status(201).json(fee);
    } catch (err) {
      console.error("createFee error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── MARK AS PAID ────────────────────────────────────── */
router.patch("/:id/pay", authenticateToken, async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: "Fee not found" });

    if (
      req.user.role === "student" &&
      String(fee.student) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (fee.status === "paid") {
      return res.status(400).json({ error: "Fee is already paid" });
    }

    fee.status = "paid";
    fee.paidAt = new Date();
    await fee.save();

    res.json(fee);
  } catch (err) {
    console.error("markFeePaid error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── UPDATE FEE (admin) ──────────────────────────────── */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const allowed  = ["description", "amount", "dueDate", "status", "semester", "category"];
      const updates  = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

      const fee = await Fee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!fee) return res.status(404).json({ error: "Fee not found" });

      res.json(fee);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── DELETE FEE (admin) ──────────────────────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const deleted = await Fee.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Fee not found" });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;