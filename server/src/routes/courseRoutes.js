import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Course from "../models/Course.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

const courseSchema = z.object({
  title:          z.string().min(1, "Title is required").max(200).trim(),
  description:    z.string().max(2000).optional().default(""),
  duration:       z.string().min(1, "Duration is required").max(100).trim(),
  image:          z.string().url("Image must be a valid URL").optional().or(z.literal("")).default(""),
  courseType:     z.enum(["academic", "private"]).default("private"),
  isFree:         z.boolean().optional().default(true),
  price:          z.coerce.number().min(0).optional().default(0),
  department:     z.string().optional().nullable().default(null),
  semesterNumber: z.coerce.number().int().min(1).max(8).optional().nullable().default(null),
  subjectCode:    z.string().optional().default(""),
  credits:        z.coerce.number().optional().default(0),
});

const updateCourseSchema = courseSchema.partial();

const normaliseCourse = (c) => c;

/* ─── GET ALL COURSES ─────────────────────────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.user.role === "student") {
      // Students only see approved courses
      filter.approvalStatus = "approved";
    } else if (req.user.role === "instructor") {
      // Instructors see only their own courses (any approval status)
      filter.instructor = req.user._id;
    }
    // Admin sees all

    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.courseType)     filter.courseType     = req.query.courseType;
    if (req.query.department)     filter.department     = req.query.department;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("instructor",  "username email")
        .populate("department",  "name code")
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

/* ─── GET BY ID ───────────────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id)
      .populate("instructor",       "username email")
      .populate("enrolledStudents", "username email")
      .populate("department",       "name code")
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

/* ─── CREATE COURSE ───────────────────────────────────── */
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

      // Admin-created courses are auto-approved
      // Instructor-created courses start as pending_approval
      const approvalStatus = req.user.role === "admin" ? "approved" : "pending_approval";

      const course = await Course.create({
        ...data,
        instructor: req.user._id,
        approvalStatus,
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

/* ─── UPDATE COURSE ───────────────────────────────────── */
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

      if (
        req.user.role === "instructor" &&
        String(existingCourse.instructor) !== String(req.user._id)
      ) {
        return res.status(403).json({ error: "You can only update your own courses" });
      }

      const parsed = updateCourseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      // If instructor edits a rejected course, reset to pending_approval
      const updates = { ...parsed.data };
      if (
        req.user.role === "instructor" &&
        existingCourse.approvalStatus === "rejected"
      ) {
        updates.approvalStatus = "pending_approval";
        updates.rejectionNote  = "";
      }

      const updated = await Course.findByIdAndUpdate(id, updates, {
        new:           true,
        runValidators: true,
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

/* ─── APPROVE / REJECT COURSE (admin only) ────────────── */
router.patch(
  "/:id/approve",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionNote } = req.body;
      // action: "approve" | "reject"

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      }

      const course = await Course.findById(id);
      if (!course) return res.status(404).json({ error: "Course not found" });

      course.approvalStatus = action === "approve" ? "approved" : "rejected";
      course.rejectionNote  = action === "reject" ? (rejectionNote || "") : "";
      if (action === "approve") course.status = "active";

      await course.save();

      res.json({ message: `Course ${action}d`, course });
    } catch (err) {
      console.error("approveCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── DELETE COURSE ───────────────────────────────────── */
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

      if (
        req.user.role === "instructor" &&
        String(course.instructor) !== String(req.user._id)
      ) {
        return res.status(403).json({ error: "You can only delete your own courses" });
      }

      await Course.findByIdAndDelete(id);
      res.json({ message: "Course deleted successfully" });
    } catch (err) {
      console.error("deleteCourse error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ─── ENROLL ──────────────────────────────────────────── */
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

    // Academic course: check student is in the right department + semester
    if (course.courseType === "academic") {
      const profile = await StudentProfile.findOne({ user: userId });
      if (!profile) {
        return res.status(403).json({ error: "Complete your profile before enrolling in academic courses" });
      }

      const deptMatch = profile.department &&
        String(profile.department) === String(course.department?._id || course.department);
      const semMatch  = !course.semesterNumber ||
        profile.year === Math.ceil(course.semesterNumber / 2);

      if (!deptMatch) {
        return res.status(403).json({
          error: `This course is only for ${course.department?.name || "a specific"} department students`,
        });
      }
      if (!semMatch) {
        return res.status(403).json({
          error: `This course is only for semester ${course.semesterNumber} students`,
        });
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

    res.json({ message: "Successfully enrolled in course" });
  } catch (err) {
    console.error("enrollCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─── UNENROLL ────────────────────────────────────────── */
router.delete("/:id/enroll", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

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