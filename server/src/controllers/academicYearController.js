import { z } from "zod";
import AcademicYear from "../models/AcademicYear.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

const semesterInput = z.object({
  number:    z.coerce.number().int().min(1).max(8),
  label:     z.string().min(1).max(50).trim(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid start date"),
  endDate:   z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid end date"),
  isActive:  z.boolean().optional().default(false),
});

const academicYearSchema = z.object({
  label:     z.string().min(4).max(20).trim(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid start date"),
  endDate:   z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid end date"),
  isCurrent: z.boolean().optional().default(false),
  semesters: z.array(semesterInput).optional().default([]),
});

/* ─── GET ALL ─────────────────────────────────────────────── */
export const getAcademicYears = async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1 }).lean();
    res.json(years);
  } catch (err) {
    console.error("getAcademicYears error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET CURRENT ─────────────────────────────────────────── */
export const getCurrentAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!year) return res.status(404).json({ error: "No current academic year set" });
    res.json(year);
  } catch (err) {
    console.error("getCurrentAcademicYear error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET BY ID ───────────────────────────────────────────── */
export const getAcademicYearById = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id).lean();
    if (!year) return res.status(404).json({ error: "Academic year not found" });
    res.json(year);
  } catch (err) {
    console.error("getAcademicYearById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── CREATE ──────────────────────────────────────────────── */
export const createAcademicYear = async (req, res) => {
  try {
    const parsed = academicYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { label, startDate, endDate, isCurrent, semesters } = parsed.data;

    const existing = await AcademicYear.findOne({ label });
    if (existing) {
      return res.status(409).json({ error: "Academic year with this label already exists" });
    }

    const year = new AcademicYear({
      label,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      isCurrent,
      semesters: semesters.map((s) => ({
        ...s,
        startDate: new Date(s.startDate),
        endDate:   new Date(s.endDate),
      })),
    });

    await year.save(); // pre-save hook handles isCurrent uniqueness
    res.status(201).json(year);
  } catch (err) {
    console.error("createAcademicYear error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── UPDATE ──────────────────────────────────────────────── */
export const updateAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ error: "Academic year not found" });

    const parsed = academicYearSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = parsed.data;
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate)   updates.endDate   = new Date(updates.endDate);
    if (updates.semesters) {
      updates.semesters = updates.semesters.map((s) => ({
        ...s,
        startDate: new Date(s.startDate),
        endDate:   new Date(s.endDate),
      }));
    }

    Object.assign(year, updates);
    await year.save();
    res.json(year);
  } catch (err) {
    console.error("updateAcademicYear error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── SET CURRENT ─────────────────────────────────────────── */
export const setCurrentAcademicYear = async (req, res) => {
  try {
    // Unset all others first
    await AcademicYear.updateMany({}, { $set: { isCurrent: false } });

    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { $set: { isCurrent: true } },
      { new: true }
    );
    if (!year) return res.status(404).json({ error: "Academic year not found" });

    res.json({ message: "Current academic year updated", year });
  } catch (err) {
    console.error("setCurrentAcademicYear error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── SET ACTIVE SEMESTER ─────────────────────────────────── */
export const setActiveSemester = async (req, res) => {
  try {
    const { yearId, semesterId } = req.params;

    const year = await AcademicYear.findById(yearId);
    if (!year) return res.status(404).json({ error: "Academic year not found" });

    // Deactivate all semesters, activate the chosen one
    year.semesters = year.semesters.map((s) => ({
      ...s.toObject(),
      isActive: String(s._id) === semesterId,
    }));

    await year.save();
    res.json({ message: "Active semester updated", year });
  } catch (err) {
    console.error("setActiveSemester error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── DELETE ──────────────────────────────────────────────── */
export const deleteAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ error: "Academic year not found" });
    if (year.isCurrent) {
      return res.status(400).json({ error: "Cannot delete the current academic year" });
    }

    await AcademicYear.findByIdAndDelete(req.params.id);
    res.json({ message: "Academic year deleted" });
  } catch (err) {
    console.error("deleteAcademicYear error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
