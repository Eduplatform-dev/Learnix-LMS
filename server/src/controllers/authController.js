import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import { env } from "../config/env.js";

/* ── Optional Activity + Audit logging ── */
let Activity = null;
let AuditLog = null;
try {
  const mod = await import("../models/Activity.js");
  Activity = mod.default;
} catch { /* skip */ }

try {
  const mod = await import("../models/AuditLog.js");
  AuditLog = mod.default;
} catch { /* skip */ }

// FIX: guard against null userId — AuditLog.actor is required
const logAudit = async (req, userId, email, role, action, details, status = "success") => {
  if (!AuditLog) return;
  if (!userId) return; // cannot log without a valid actor
  try {
    await AuditLog.create({
      actor:      userId,
      actorEmail: email,
      actorRole:  role,
      action,
      resource:   "auth",
      resourceId: String(userId),
      details,
      ip:         req.ip || req.connection?.remoteAddress || "",
      userAgent:  req.get("user-agent") || "",
      status,
    });
  } catch { /* never crash auth */ }
};

/* ─── Schemas ────────────────────────────────────────────── */
const registerSchema = z.object({
  email:    z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role:     z.enum(["student", "instructor", "admin"]).optional().default("student"),
});

const loginSchema = z.object({
  email:            z.string().email().optional(),
  enrollmentNumber: z.string().optional(),
  password:         z.string().min(1, "Password is required"),
}).refine(d => d.email || d.enrollmentNumber, {
  message: "Either email or enrollment number is required",
});

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, username, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ username }),
    ]);

    if (emailExists)    return res.status(409).json({ error: "Email already registered" });
    if (usernameExists) return res.status(409).json({ error: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      username,
      password: hashedPassword,
      role,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });

    await logAudit(req, user._id, user.email, user.role, "REGISTER", "New account registered");

    res.status(201).json({
      token,
      user: { _id: user._id, id: user._id, email: user.email, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, enrollmentNumber, password } = parsed.data;
    let user;

    if (enrollmentNumber) {
      /* ── Login via Enrollment Number ── */
      const profile = await StudentProfile.findOne({
        enrollmentNumber: enrollmentNumber.trim(),
      });

      if (!profile) {
        // FIX: don't call logAudit with null userId — just return 401
        return res.status(401).json({ error: "Invalid credentials" });
      }

      user = await User.findById(profile.user).select("+password");
    } else {
      /* ── Login via Email ── */
      const normalizedEmail = email.toLowerCase().trim();
      user = await User.findOne({ email: normalizedEmail }).select("+password");
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await logAudit(req, user._id, user.email, user.role, "LOGIN_FAILED",
        "Wrong password", "failure");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });

    await logAudit(req, user._id, user.email, user.role, "LOGIN",
      enrollmentNumber ? `Login via enrollment number` : "Login via email");

    res.json({
      token,
      user: { _id: user._id, id: user._id, email: user.email, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};