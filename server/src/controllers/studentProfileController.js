import { z } from "zod";
import mongoose from "mongoose";
import StudentProfile from "../models/StudentProfile.js";
import User from "../models/User.js";

/* ─── VALIDATION SCHEMAS ──────────────────────────────────── */

const addressSchema = z.object({
  street:  z.string().max(200).optional().default(""),
  city:    z.string().max(100).optional().default(""),
  state:   z.string().max(100).optional().default(""),
  pinCode: z.string().max(10).optional().default(""),
  country: z.string().max(100).optional().default("India"),
}).optional().default({});

const profileSchema = z.object({
  // Personal
  fullName:         z.string().max(100).trim().optional().default(""),
  enrollmentNumber: z.string().max(30).trim().optional().nullable().default(null),
  dateOfBirth:      z.string().optional().nullable().default(null),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say", ""])
    .optional()
    .default(""),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
    .optional()
    .default(""),
  nationality: z.string().max(50).optional().default("Indian"),
  religion:    z.string().max(50).optional().default(""),
  category: z
    .enum(["general", "obc", "sc", "st", "nt", "ewS", "other", ""])
    .optional()
    .default(""),
  photoUrl: z.string().max(500).optional().default(""),
  phone:    z.string().max(15).optional().default(""),

  // Addresses
  permanentAddress:      addressSchema,
  correspondenceAddress: addressSchema
    .and(z.object({ sameAsPermanent: z.boolean().optional().default(true) }))
    .optional(),

  // Guardian
  father: z.object({
    name:         z.string().max(100).optional().default(""),
    occupation:   z.string().max(100).optional().default(""),
    phone:        z.string().max(15).optional().default(""),
    email:        z.string().max(100).optional().default(""),
    annualIncome: z.coerce.number().min(0).optional().default(0),
  }).optional().default({}),
  mother: z.object({
    name:       z.string().max(100).optional().default(""),
    occupation: z.string().max(100).optional().default(""),
    phone:      z.string().max(15).optional().default(""),
    email:      z.string().max(100).optional().default(""),
  }).optional().default({}),
  localGuardian: z.object({
    name:     z.string().max(100).optional().default(""),
    relation: z.string().max(50).optional().default(""),
    phone:    z.string().max(15).optional().default(""),
    address:  z.string().max(300).optional().default(""),
  }).optional().default({}),

  // Academic
  department:            z.string().optional().nullable().default(null),
  academicYear:          z.string().optional().nullable().default(null),
  currentSemesterId:     z.string().optional().nullable().default(null),
  currentSemesterNumber: z.coerce.number().min(1).max(8).optional().nullable().default(null),
  admissionYear:         z.coerce.number().min(2000).max(2100).optional().nullable().default(null),
  admissionType: z.enum(["regular", "lateral", ""]).optional().default("regular"),
  rollNumber:  z.string().max(20).optional().default(""),
  division:    z.string().max(5).optional().default(""),
  batch:       z.string().max(20).optional().default(""),

  // Previous Education
  previousEducation: z.object({
    institution:  z.string().max(200).optional().default(""),
    board:        z.string().max(100).optional().default(""),
    percentage:   z.coerce.number().min(0).max(100).optional().default(0),
    passingYear:  z.coerce.number().min(1990).max(2100).optional().nullable().default(null),
  }).optional().default({}),
});

/* helper — calculate if profile is "complete enough" */
const calcIsComplete = (data) =>
  !!(
    data.fullName &&
    data.enrollmentNumber &&
    data.phone &&
    data.dateOfBirth &&
    data.department &&
    data.currentSemesterNumber &&
    data.father?.name
  );

/* ─── GET MY PROFILE (student) ────────────────────────────── */
export const getMyProfile = async (req, res) => {
  try {
    let profile = await StudentProfile.findOne({ user: req.user._id })
      .populate("department", "name code")
      .populate("academicYear", "label");

    if (!profile) {
      // Auto-create empty profile on first access
      profile = await StudentProfile.create({ user: req.user._id });
    }

    res.json(profile);
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── UPDATE MY PROFILE (student) ─────────────────────────── */
export const updateMyProfile = async (req, res) => {
  try {
    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);

    // Determine profile completeness
    const existing = await StudentProfile.findOne({ user: req.user._id }).lean();
    const merged   = { ...existing, ...updates };
    updates.isProfileComplete = calcIsComplete(merged);

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true, upsert: true, runValidators: true }
    )
      .populate("department", "name code")
      .populate("academicYear", "label");

    // Keep User model denormalized fields in sync
    const userUpdates = {};
    if (updates.department          !== undefined) userUpdates.department            = updates.department;
    if (updates.currentSemesterNumber !== undefined) userUpdates.currentSemesterNumber = updates.currentSemesterNumber;
    if (updates.academicYear          !== undefined) userUpdates.academicYear          = updates.academicYear;
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, userUpdates);
    }

    res.json(profile);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Enrollment number already registered" });
    }
    console.error("updateMyProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET PROFILE BY USER ID (admin / instructor) ─────────── */
export const getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const profile = await StudentProfile.findOne({ user: userId })
      .populate("user", "username email role createdAt")
      .populate("department", "name code")
      .populate("academicYear", "label startDate endDate");

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    res.json(profile);
  } catch (err) {
    console.error("getProfileByUserId error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── LIST ALL PROFILES (admin) ────────────────────────────── */
export const getAllProfiles = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.department)  filter.department            = req.query.department;
    if (req.query.semester)    filter.currentSemesterNumber = Number(req.query.semester);
    if (req.query.status)      filter.verificationStatus    = req.query.status;
    if (req.query.division)    filter.division              = req.query.division;

    const [profiles, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate("user", "username email")
        .populate("department", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    res.json({ profiles, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── ADMIN: verify / reject a profile ─────────────────────── */
export const verifyProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, note } = req.body;

    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user: userId },
      {
        verificationStatus: status,
        verificationNote:   note || "",
      },
      { new: true }
    );

    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (err) {
    console.error("verifyProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── ADMIN: update profile on behalf of student ────────────── */
export const adminUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);

    const profile = await StudentProfile.findOneAndUpdate(
      { user: userId },
      updates,
      { new: true, upsert: true, runValidators: true }
    )
      .populate("user", "username email")
      .populate("department", "name code");

    // Sync User model
    const userUpdates = {};
    if (updates.department            !== undefined) userUpdates.department            = updates.department;
    if (updates.currentSemesterNumber !== undefined) userUpdates.currentSemesterNumber = updates.currentSemesterNumber;
    if (updates.academicYear          !== undefined) userUpdates.academicYear          = updates.academicYear;
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, userUpdates);
    }

    res.json(profile);
  } catch (err) {
    console.error("adminUpdateProfile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
