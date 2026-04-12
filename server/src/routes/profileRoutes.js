import express from "express";
import { z } from "zod";
import StudentProfile from "../models/StudentProfile.js";
import InstructorProfile from "../models/InstructorProfile.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { env } from "../config/env.js";

const router = express.Router();

const baseUrl = (req) =>
  env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

/* ══════════════════════════════════════════════════════════
   STUDENT PROFILE — onboarding schema (self-service)
══════════════════════════════════════════════════════════ */

const studentProfileSchema = z.object({
  department:    z.string().min(1),
  semester:      z.string().optional(),
  year:          z.coerce.number().int().min(1).max(6),
  division:      z.string().max(10).optional().default(""),
  rollNumber:    z.string().max(20).optional().default(""),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  fullName:      z.string().min(2).max(100).trim(),
  dateOfBirth:   z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  gender:        z.enum(["male", "female", "other"]),
  bloodGroup:    z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-","unknown"]).optional().default("unknown"),
  phoneNumber:   z.string().max(15).optional().default(""),
  "address.street":  z.string().max(200).optional().default(""),
  "address.city":    z.string().max(100).optional().default(""),
  "address.state":   z.string().max(100).optional().default(""),
  "address.pincode": z.string().max(10).optional().default(""),
  parentName:       z.string().min(2).max(100).trim(),
  parentPhone:      z.string().max(15).optional().default(""),
  parentEmail:      z.string().email().optional().or(z.literal("")).default(""),
  parentOccupation: z.string().max(100).optional().default(""),
  category: z.enum(["general","obc","sc","st","nt","other"]).optional().default("general"),
});

/* ─── GET my student profile ──────────────────────────── */
router.get("/student/me", authenticateToken, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id })
      .populate("department", "name code")
      .populate("semester",   "name academicYear");
    res.json(profile || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── CREATE student profile (one-time, locked after submit) ─ */
router.post(
  "/student",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({ error: "Only students can submit a student profile" });
      }

      const existing = await StudentProfile.findOne({ user: req.user._id });
      if (existing?.isSubmitted) {
        return res.status(409).json({ error: "Profile already submitted and cannot be changed" });
      }

      const parsed = studentProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const {
        "address.street": street,
        "address.city":   city,
        "address.state":  state,
        "address.pincode": pincode,
        ...rest
      } = parsed.data;

      const photoUrl = req.file
        ? `${baseUrl(req)}/uploads/${req.file.filename}`
        : "";

      const profileData = {
        ...rest,
        user:        req.user._id,
        dateOfBirth: new Date(rest.dateOfBirth),
        address:     { street, city, state, pincode },
        photo:       photoUrl,
        isSubmitted: true,
        submittedAt: new Date(),
      };

      let profile;
      if (existing) {
        Object.assign(existing, profileData);
        profile = await existing.save();
      } else {
        profile = await StudentProfile.create(profileData);
      }

      res.status(201).json(profile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ══════════════════════════════════════════════════════════
   INSTRUCTOR PROFILE — onboarding schema (self-service)
══════════════════════════════════════════════════════════ */

const instructorProfileSchema = z.object({
  employeeId:      z.string().min(1).max(30).trim(),
  department:      z.string().min(1),
  designation:     z.string().min(2).max(100).trim(),
  qualification:   z.string().max(200).optional().default(""),
  specialization:  z.string().max(200).optional().default(""),
  experienceYears: z.coerce.number().int().min(0).max(50).optional().default(0),
  joiningDate:     z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid joining date"),
  fullName:        z.string().min(2).max(100).trim(),
  dateOfBirth:     z.string().optional(),
  gender:          z.enum(["male", "female", "other"]),
  bloodGroup:      z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-","unknown"]).optional().default("unknown"),
  phoneNumber:     z.string().max(15).optional().default(""),
  "address.street":  z.string().max(200).optional().default(""),
  "address.city":    z.string().max(100).optional().default(""),
  "address.state":   z.string().max(100).optional().default(""),
  "address.pincode": z.string().max(10).optional().default(""),
});

/* ─── GET my instructor profile ───────────────────────── */
router.get("/instructor/me", authenticateToken, async (req, res) => {
  try {
    const profile = await InstructorProfile.findOne({ user: req.user._id })
      .populate("department", "name code");
    res.json(profile || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── CREATE instructor profile (one-time) ─────────────── */
router.post(
  "/instructor",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (req.user.role !== "instructor") {
        return res.status(403).json({ error: "Only instructors can submit an instructor profile" });
      }

      const existing = await InstructorProfile.findOne({ user: req.user._id });
      if (existing?.isSubmitted) {
        return res.status(409).json({ error: "Profile already submitted and cannot be changed" });
      }

      const parsed = instructorProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const {
        "address.street":  street,
        "address.city":    city,
        "address.state":   state,
        "address.pincode": pincode,
        dateOfBirth,
        joiningDate,
        ...rest
      } = parsed.data;

      const photoUrl = req.file
        ? `${baseUrl(req)}/uploads/${req.file.filename}`
        : "";

      const profileData = {
        ...rest,
        user:        req.user._id,
        joiningDate: new Date(joiningDate),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address:     { street, city, state, pincode },
        photo:       photoUrl,
        isSubmitted: true,
        submittedAt: new Date(),
      };

      let profile;
      if (existing) {
        Object.assign(existing, profileData);
        profile = await existing.save();
      } else {
        profile = await InstructorProfile.create(profileData);
      }

      res.status(201).json(profile);
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({ error: `${field} already in use` });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/* ══════════════════════════════════════════════════════════
   ADMIN: view / update any profile
   FIX: admin can update ALL fields, not just a restricted whitelist
══════════════════════════════════════════════════════════ */

/* GET all student profiles (admin) */
router.get(
  "/students",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const skip  = (page - 1) * limit;

      const filter = {};
      if (req.query.department) filter.department = req.query.department;
      if (req.query.year)       filter.year       = parseInt(req.query.year);
      // Remove isSubmitted filter so admin sees ALL students including those who haven't submitted
      // if (req.query.submitted === "true") filter.isSubmitted = true;

      const [profiles, total] = await Promise.all([
        StudentProfile.find(filter)
          .populate("user",       "username email createdAt")
          .populate("department", "name code")
          .populate("semester",   "name academicYear")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        StudentProfile.countDocuments(filter),
      ]);

      res.json({ profiles, total, page });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* GET student profile by userId (admin) */
router.get(
  "/students/:userId",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const profile = await StudentProfile.findOne({ user: req.params.userId })
        .populate("user",       "username email")
        .populate("department", "name code")
        .populate("semester",   "name academicYear");
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ADMIN: update student profile — full access to all fields */
router.put(
  "/students/:userId",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      // Admin can update ANY field including enrollment number
      // Build updates from body — whitelist expanded to all editable fields
      const allowed = [
        "enrollmentNumber",   // admin-only field students cannot set
        "department",
        "semester",
        "year",
        "division",
        "rollNumber",
        "admissionYear",
        "fullName",
        "dateOfBirth",
        "gender",
        "bloodGroup",
        "phoneNumber",
        "address",
        "parentName",
        "parentPhone",
        "parentEmail",
        "parentOccupation",
        "category",
      ];

      const updates = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }

      if (updates.dateOfBirth) {
        updates.dateOfBirth = new Date(updates.dateOfBirth);
      }

      const profile = await StudentProfile.findOneAndUpdate(
        { user: req.params.userId },
        updates,
        { new: true, upsert: false }
      ).populate("user", "username email")
       .populate("department", "name code");

      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Enrollment number already in use" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/* GET all instructor profiles (admin) */
router.get(
  "/instructors",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const profiles = await InstructorProfile.find()
        .populate("user",       "username email createdAt")
        .populate("department", "name code")
        .sort({ createdAt: -1 });
      res.json(profiles);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* GET single instructor profile (admin) */
router.get(
  "/instructors/:userId",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const profile = await InstructorProfile.findOne({ user: req.params.userId })
        .populate("user",       "username email")
        .populate("department", "name code");
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ADMIN: update instructor profile — full access */
router.put(
  "/instructors/:userId",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const allowed = [
        "employeeId",
        "department",
        "designation",
        "qualification",
        "specialization",
        "experienceYears",
        "joiningDate",
        "fullName",
        "dateOfBirth",
        "gender",
        "bloodGroup",
        "phoneNumber",
        "address",
      ];

      const updates = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }

      if (updates.joiningDate) updates.joiningDate = new Date(updates.joiningDate);
      if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);

      const profile = await InstructorProfile.findOneAndUpdate(
        { user: req.params.userId },
        updates,
        { new: true, upsert: false }
      ).populate("user",       "username email")
       .populate("department", "name code");

      if (!profile) return res.status(404).json({ error: "Profile not found" });
      res.json(profile);
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({ error: `${field} already in use` });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;