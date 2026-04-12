import { z } from "zod";
import Fee from "../models/Fee.js";

const feeSchema = z.object({
  description: z.string().min(1).max(200).trim(),
  amount: z.number().positive(),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  status: z.enum(["paid", "pending", "overdue"]).optional().default("pending"),
  invoice: z.string().optional().default(""),
  semester: z.string().optional().default(""),
  category: z.enum(["tuition", "lab", "technology", "certification", "other"]).optional().default("tuition"),
});

/* ================= GET MY FEES (student) ================= */
export const getMyFees = async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.user._id }).sort({ dueDate: 1 });

    const totalPaid = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
    const totalPending = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
    const nextFee = fees.find((f) => f.status === "pending");

    res.json({ fees, totalPaid, totalPending, nextFee: nextFee || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET ALL FEES (admin) ================= */
export const getAllFees = async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate("student", "username email")
      .sort({ createdAt: -1 });

    const totalRevenue = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
    const pending = fees.filter((f) => f.status === "pending").reduce((s, f) => s + f.amount, 0);

    res.json({ fees, totalRevenue, pendingPayments: pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= CREATE FEE (admin) ================= */
export const createFee = async (req, res) => {
  try {
    const { studentId, ...rest } = req.body;
    if (!studentId) return res.status(400).json({ error: "studentId required" });

    const parsed = feeSchema.safeParse(rest);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    // Auto-generate invoice number
    const count = await Fee.countDocuments();
    const invoice = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const fee = await Fee.create({
      student: studentId,
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate),
      invoice,
    });

    res.status(201).json(fee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= MARK AS PAID ================= */
export const markAsPaid = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: "Fee not found" });

    // Students can only pay their own fees
    if (req.user.role === "student" && String(fee.student) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    fee.status = "paid";
    fee.paidAt = new Date();
    await fee.save();

    res.json(fee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE FEE (admin) ================= */
export const deleteFee = async (req, res) => {
  try {
    const deleted = await Fee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Fee not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
