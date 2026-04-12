import mongoose from "mongoose";
import { z } from "zod";
import Assignment from "../models/Assignment.js";

const assignmentSchema = z.object({
  title:       z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(2000).optional().default(""),
  course:      z.string().optional().default(""),
  dueDate:     z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid due date"),
  maxMarks:    z.coerce.number().int().positive().optional().default(100),
});

const updateAssignmentSchema = assignmentSchema.partial();

/* ================= GET ASSIGNMENTS ================= */
export const getAssignments = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip   = (page - 1) * limit;

    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.status) filter.status = req.query.status;

    // Instructors only see their own assignments
    if (req.user?.role === "instructor") {
      filter.instructor = req.user._id;
    }

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .populate("course", "title")
        .populate("instructor", "username email")
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit),
      Assignment.countDocuments(filter),
    ]);

    res.json(assignments);
  } catch (err) {
    console.error("getAssignments error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= GET ASSIGNMENT BY ID ================= */
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await Assignment.findById(id)
      .populate("course", "title")
      .populate("instructor", "username email");

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json(assignment);
  } catch (err) {
    console.error("getAssignmentById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= CREATE ASSIGNMENT ================= */
export const createAssignment = async (req, res) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { title, description, course, dueDate, maxMarks } = parsed.data;

    const assignment = await Assignment.create({
      title,
      description,
      course: course || undefined,
      dueDate:    new Date(dueDate),
      maxMarks,
      instructor: req.user._id,
    });

    const populated = await assignment.populate([
      { path: "course",     select: "title" },
      { path: "instructor", select: "username email" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error("createAssignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= UPDATE ASSIGNMENT ================= */
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    // Instructors can only update their own assignments
    const existing = await Assignment.findById(id);
    if (!existing) return res.status(404).json({ error: "Assignment not found" });

    if (
      req.user.role === "instructor" &&
      String(existing.instructor) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "You can only update your own assignments" });
    }

    const parsed = updateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

    const updated = await Assignment.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("updateAssignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= DELETE ASSIGNMENT ================= */
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // Instructors can only delete their own assignments
    if (
      req.user.role === "instructor" &&
      String(assignment.instructor) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "You can only delete your own assignments" });
    }

    await Assignment.findByIdAndDelete(id);
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("deleteAssignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};