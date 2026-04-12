import express from "express";
import { z } from "zod";
import User from "../models/User.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const router = express.Router();

const createUserSchema = z.object({
  email:    z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30).trim(),
  role:     z.enum(["student", "instructor", "admin"]).optional().default("student"),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(30).trim().optional(),
  email:    z.string().email().toLowerCase().trim().optional(),
  password: z.string().min(6).optional(),
});

/* ─── GET ALL USERS (admin) ───────────────────────────── */
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

      // Support role filter — useful for fetching only students or only instructors
      if (req.query.role) {
        filter.role = req.query.role;
      }
      // FIX: if no role specified, still exclude admins from general listings
      // Admin can see admins only if explicitly requesting role=admin
      if (!req.query.role) {
        filter.role = { $ne: "admin" };
      }

      if (req.query.search) {
        const re = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ username: re }, { email: re }];
      }

      const [users, total] = await Promise.all([
        User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter),
      ]);

      res.json(users);
    } catch (err) {
      console.error("getUsers error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── CREATE USER (admin) ─────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password, username, role } = parsed.data;

      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.status(409).json({
          error: exists.email === email ? "Email already in use" : "Username already taken",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ email, username, password: hashedPassword, role });

      res.status(201).json({
        _id:      user._id,
        email:    user.email,
        username: user.username,
        role:     user.role,
      });
    } catch (err) {
      console.error("createUser error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── GET USER BY ID ──────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── UPDATE USER ─────────────────────────────────────── */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const isSelf  = req.user._id.toString() === req.params.id;
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // Check for conflicts if changing email/username
    if (updates.email || updates.username) {
      const conditions = [];
      if (updates.email)    conditions.push({ email: updates.email });
      if (updates.username) conditions.push({ username: updates.username });
      const conflict = await User.findOne({
        $or: conditions,
        _id: { $ne: req.params.id },
      });
      if (conflict) {
        return res.status(409).json({
          error: conflict.email === updates.email ? "Email already in use" : "Username already taken",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── UPDATE ROLE (admin) ─────────────────────────────── */
router.patch(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const parsed = z.object({
        role: z.enum(["student", "instructor", "admin"]),
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { role: parsed.data.role },
        { new: true }
      ).select("-password");

      if (!updatedUser) return res.status(404).json({ error: "User not found" });

      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── DELETE USER (admin) ─────────────────────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "User not found" });
      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;