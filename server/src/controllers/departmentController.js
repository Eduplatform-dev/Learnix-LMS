import { z } from "zod";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

const departmentSchema = z.object({
  name:        z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  code:        z.string().min(2, "Code must be at least 2 characters").max(10).trim().toUpperCase(),
  description: z.string().max(500).optional().default(""),
  hodId:       z.string().optional().nullable().default(null),
  totalIntake: z.coerce.number().int().min(0).optional().default(0),
  isActive:    z.boolean().optional().default(true),
});

const updateSchema = departmentSchema.partial();

/* ─── GET ALL ─────────────────────────────────────────────── */
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate("hodId", "username email")
      .sort({ name: 1 })
      .lean();

    // Attach student and course counts for each department
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const [studentCount, courseCount] = await Promise.all([
          User.countDocuments({ department: dept._id, role: "student", isActive: true }),
          Course.countDocuments({ department: dept._id, status: { $ne: "archived" } }),
        ]);
        return { ...dept, studentCount, courseCount };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("getDepartments error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET ALL including inactive (admin) ─────────────────── */
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("hodId", "username email")
      .sort({ name: 1 })
      .lean();
    res.json(departments);
  } catch (err) {
    console.error("getAllDepartments error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET BY ID ───────────────────────────────────────────── */
export const getDepartmentById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id)
      .populate("hodId", "username email");

    if (!dept) return res.status(404).json({ error: "Department not found" });

    const [studentCount, courseCount, instructorCount] = await Promise.all([
      User.countDocuments({ department: dept._id, role: "student" }),
      Course.countDocuments({ department: dept._id }),
      User.countDocuments({ department: dept._id, role: "instructor" }),
    ]);

    res.json({ ...dept.toObject(), studentCount, courseCount, instructorCount });
  } catch (err) {
    console.error("getDepartmentById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── CREATE ──────────────────────────────────────────────── */
export const createDepartment = async (req, res) => {
  try {
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, code, description, hodId, totalIntake, isActive } = parsed.data;

    // Check for duplicate name or code
    const existing = await Department.findOne({
      $or: [
        { name: { $regex: `^${name}$`, $options: "i" } },
        { code: code.toUpperCase() },
      ],
    });
    if (existing) {
      return res.status(409).json({
        error: existing.code === code.toUpperCase()
          ? "Department code already exists"
          : "Department name already exists",
      });
    }

    const dept = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
      hodId: hodId || null,
      totalIntake,
      isActive,
    });

    const populated = await dept.populate("hodId", "username email");
    res.status(201).json(populated);
  } catch (err) {
    console.error("createDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── UPDATE ──────────────────────────────────────────────── */
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };
    if (updates.code) updates.code = updates.code.toUpperCase();
    if (updates.hodId === "") updates.hodId = null;

    const dept = await Department.findByIdAndUpdate(id, updates, {
      new: true, runValidators: true,
    }).populate("hodId", "username email");

    if (!dept) return res.status(404).json({ error: "Department not found" });

    res.json(dept);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      return res.status(409).json({ error: `${field} already exists` });
    }
    console.error("updateDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── DELETE (soft delete — sets isActive: false) ────────── */
export const deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json({ message: "Department deactivated successfully" });
  } catch (err) {
    console.error("deleteDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET STUDENTS IN DEPARTMENT ──────────────────────────── */
export const getDepartmentStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = req.query.semester ? Number(req.query.semester) : null;

    const filter = { department: id, role: "student" };
    if (semester) filter.currentSemesterNumber = semester;

    const students = await User.find(filter)
      .select("-password")
      .sort({ username: 1 });

    res.json(students);
  } catch (err) {
    console.error("getDepartmentStudents error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET INSTRUCTORS IN DEPARTMENT ───────────────────────── */
export const getDepartmentInstructors = async (req, res) => {
  try {
    const instructors = await User.find({
      department: req.params.id,
      role: "instructor",
    })
      .select("-password")
      .sort({ username: 1 });

    res.json(instructors);
  } catch (err) {
    console.error("getDepartmentInstructors error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
