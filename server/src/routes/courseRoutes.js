// server/src/routes/courseRoutes.js
// FIXED: Academic = admin-only creation, auto-approved, dept+sem required
//        Private  = instructor/admin, pending_approval flow

import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Course from "../models/Course.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const courseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(2000).optional().default(""),
  duration: z.string().min(1, "Duration is required").max(100).trim(),
  image: z.string().url().optional().or(z.literal("")).default(""),
  courseType: z.enum(["academic", "private"]).default("private"),
  isFree: z.boolean().optional().default(true),
  price: z.coerce.number().min(0).optional().default(0),
  // Academic fields — required when courseType === "academic"
  department: z.string().optional().nullable().default(null),
  semesterNumber: z.coerce.number().int().min(1).max(8).optional().nullable().default(null),
  subjectCode: z.string().optional().default(""),
  instructor: z.string().optional().nullable().default(null),
  credits: z.coerce.number().optional().default(0),
  academicYear: z.string().optional().nullable().default(null),
}).refine((data) => {
  if (data.courseType === "academic") {
    return !!data.department && !!data.semesterNumber;
  }
  return true;
}, { message: "Academic courses require department and semester number" });

const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  duration: z.string().min(1).max(100).trim().optional(),
  image: z.string().url().optional().or(z.literal("")).optional(),
  courseType: z.enum(["academic", "private"]).optional(),
  isFree: z.boolean().optional(),
  price: z.coerce.number().min(0).optional(),
  department: z.string().optional().nullable(),
  semesterNumber: z.coerce.number().int().min(1).max(8).optional().nullable(),
  subjectCode: z.string().optional(),
  credits: z.coerce.number().optional(),
});

/* ─── GET ALL COURSES ──────────────────────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.user.role === "student") {
      // Students see only approved courses
      filter.approvalStatus = "approved";

      // If filtering by type, respect it
      if (req.query.courseType) filter.courseType = req.query.courseType;

    } else if (req.user.role === "instructor") {
      filter.instructor = req.user._id;
      // Instructors can see BOTH their private courses AND academic courses assigned to them
      // Do NOT restrict to courseType = "private"
    } else {
      // Admin sees all
      if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
      if (req.query.courseType) filter.courseType = req.query.courseType;
    }

    if (req.query.department) filter.department = req.query.department;
    if (req.query.semesterNumber) filter.semesterNumber = parseInt(req.query.semesterNumber);

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("instructor", "username email")
        .populate("department", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    res.json({ courses, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getCourses error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── GET BY ID ──────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id)
      .populate("instructor", "username email")
      .populate("enrolledStudents", "username email")
      .populate("department", "name code");

    if (!course) return res.status(404).json({ error: "Course not found" });

    // Students can only see approved courses
    if (req.user.role === "student" && course.approvalStatus !== "approved") {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── CREATE COURSE ──────────────────────────────── */
router.post(
  "/",
  authenticateToken,
  authorize(["admin", "instructor"]),
  async (req, res) => {
    try {
      const parsed = courseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const data = parsed.data;

      // LOGIC FIX: Academic courses can only be created by admin
      if (data.courseType === "academic" && req.user.role !== "admin") {
        return res.status(403).json({
          error: "Only administrators can create academic courses. Create a private course instead.",
        });
      }

      // LOGIC FIX:
      // - Academic courses are auto-approved (admin creates them, no review needed)
      // - Private courses from instructors go through approval
      // - Private courses from admin are auto-approved
      const approvalStatus = (data.courseType === "academic" || req.user.role === "admin")
        ? "approved"
        : "pending_approval";

      const course = await Course.create({
        ...data,
        // Admin can assign a specific instructor; instructors always own their own course
        instructor: (req.user.role === "admin" && data.instructor)
          ? data.instructor
          : req.user._id,
        approvalStatus,
        isFree: data.courseType === "academic" ? true : data.isFree,
        price: data.courseType === "academic" ? 0 : data.price,
        status: approvalStatus === "approved" ? "active" : "active",
      });

      const populated = await course.populate([
        { path: "instructor", select: "username email" },
        { path: "department", select: "name code" },
      ]);

      res.status(201).json(populated);
    } catch (err) {
      console.error("createCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── UPDATE COURSE ──────────────────────────────── */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid course ID" });
      }

      const existingCourse = await Course.findById(id);
      if (!existingCourse) return res.status(404).json({ error: "Course not found" });

      // Instructors can only update their own private courses
      if (req.user.role === "instructor") {
        if (String(existingCourse.instructor) !== String(req.user._id)) {
          return res.status(403).json({ error: "You can only update your own courses" });
        }
        if (existingCourse.courseType === "academic") {
          return res.status(403).json({ error: "Instructors cannot modify academic courses" });
        }
      }

      const parsed = updateCourseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const updates = { ...parsed.data };

      // Prevent changing course type after creation
      delete updates.courseType;

      // Academic courses stay free
      if (existingCourse.courseType === "academic") {
        updates.isFree = true;
        updates.price = 0;
      }

      // If instructor edits a rejected course, reset to pending
      if (req.user.role === "instructor" && existingCourse.approvalStatus === "rejected") {
        updates.approvalStatus = "pending_approval";
        updates.rejectionNote = "";
      }

      const updated = await Course.findByIdAndUpdate(id, updates, {
        new: true, runValidators: true,
      })
        .populate("instructor", "username email")
        .populate("department", "name code");

      res.json(updated);
    } catch (err) {
      console.error("updateCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── APPROVE / REJECT (admin only, private courses) */
router.patch(
  "/:id/approve",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionNote } = req.body;

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      }

      const course = await Course.findById(id);
      if (!course) return res.status(404).json({ error: "Course not found" });

      // Academic courses are always approved — no manual approval needed
      if (course.courseType === "academic") {
        return res.status(400).json({ error: "Academic courses are auto-approved" });
      }

      course.approvalStatus = action === "approve" ? "approved" : "rejected";
      course.rejectionNote = action === "reject" ? (rejectionNote || "") : "";
      if (action === "approve") course.status = "active";

      await course.save();
      res.json({ message: `Course ${action}d`, course });
    } catch (err) {
      console.error("approveCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── DELETE COURSE ──────────────────────────────── */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid course ID" });
      }

      const course = await Course.findById(id);
      if (!course) return res.status(404).json({ error: "Course not found" });

      if (req.user.role === "instructor") {
        if (String(course.instructor) !== String(req.user._id)) {
          return res.status(403).json({ error: "You can only delete your own courses" });
        }
        if (course.courseType === "academic") {
          return res.status(403).json({ error: "Instructors cannot delete academic courses" });
        }
      }

      await Course.findByIdAndDelete(id);
      res.json({ message: "Course deleted successfully" });
    } catch (err) {
      console.error("deleteCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── ENROLL ─────────────────────────────────────── */
router.post("/:id/enroll", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id).populate("department");
    if (!course) return res.status(404).json({ error: "Course not found" });

    if (course.approvalStatus !== "approved") {
      return res.status(403).json({ error: "Course is not available for enrollment" });
    }

    // Academic course enrollment: strict dept + semester matching
    if (course.courseType === "academic") {
      const profile = await StudentProfile.findOne({ user: userId });

      if (!profile || !profile.isSubmitted) {
        return res.status(403).json({
          error: "Complete your onboarding profile before enrolling in academic courses",
        });
      }

      const studentDeptId = profile.department?._id || profile.department;
      const courseDeptId = course.department?._id || course.department;

      if (!studentDeptId || String(studentDeptId) !== String(courseDeptId)) {
        const deptName = course.department?.name || "that";
        return res.status(403).json({
          error: `This course is for ${deptName} department students only`,
        });
      }

      // Semester check: student's year maps to semesters
      // Year 1 → semesters 1-2, Year 2 → 3-4, Year 3 → 5-6, Year 4 → 7-8
      if (course.semesterNumber) {
        const studentYear = profile.year;
        if (studentYear) {
          const semMin = (studentYear - 1) * 2 + 1;
          const semMax = studentYear * 2;
          if (course.semesterNumber < semMin || course.semesterNumber > semMax) {
            return res.status(403).json({
              error: `This course is for semester ${course.semesterNumber} students (Year ${Math.ceil(course.semesterNumber / 2)})`,
            });
          }
        }
      }
    }

    const alreadyEnrolled = course.enrolledStudents.some(
      (s) => s.toString() === userId.toString()
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    course.enrolledStudents.push(userId);
    await course.save();

    // Sync user's currentSemesterNumber if enrolling in an academic course
    if (course.courseType === "academic" && course.semesterNumber) {
      await User.findByIdAndUpdate(userId, {
        currentSemesterNumber: course.semesterNumber,
        department: course.department?._id || course.department,
      });
    }

    res.json({ message: "Successfully enrolled in course" });
  } catch (err) {
    console.error("enrollCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── UNENROLL ───────────────────────────────────── */
router.delete("/:id/enroll", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Students cannot unenroll from academic courses (admin must do it)
    if (course.courseType === "academic" && req.user.role === "student") {
      return res.status(403).json({
        error: "Contact your administrator to unenroll from academic courses",
      });
    }

    course.enrolledStudents = course.enrolledStudents.filter(
      (s) => s.toString() !== userId.toString()
    );
    await course.save();

    res.json({ message: "Successfully unenrolled from course" });
  } catch (err) {
    console.error("unenrollCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
