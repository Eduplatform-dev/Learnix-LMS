import mongoose from "mongoose";
import { z } from "zod";
import Course from "../models/Course.js";

const courseSchema = z.object({
  title:       z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(2000).optional().default(""),
  duration:    z.string().min(1, "Duration is required").max(100).trim(),
  image:       z.string().url("Image must be a valid URL").optional().or(z.literal("")).default(""),
});

const updateCourseSchema = courseSchema.partial();

/* ─── GET ALL COURSES ─────────────────────────────────── */
export const getCourses = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    // Instructors only see their own courses
    if (req.user?.role === "instructor") {
      filter.instructor = req.user._id;
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("instructor", "username email")
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
};

/* ─── GET BY ID ───────────────────────────────────────── */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id)
      .populate("instructor", "username email")
      .populate("enrolledStudents", "username email");

    if (!course) return res.status(404).json({ error: "Course not found" });

    res.json(course);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── CREATE COURSE ───────────────────────────────────── */
export const createCourse = async (req, res) => {
  try {
    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const course = await Course.create({
      ...parsed.data,
      instructor: req.user._id,
    });

    const populated = await course.populate("instructor", "username email");
    res.status(201).json(populated);
  } catch (err) {
    console.error("createCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── UPDATE COURSE ───────────────────────────────────── */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    // Instructors can only update their own courses
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

    const updated = await Course.findByIdAndUpdate(id, parsed.data, {
      new:           true,
      runValidators: true,
    }).populate("instructor", "username email");

    res.json(updated);
  } catch (err) {
    console.error("updateCourse error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── DELETE COURSE ───────────────────────────────────── */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Instructors can only delete their own courses
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
};

/* ─── ENROLL ──────────────────────────────────────────── */
export const enrollCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });

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
};

/* ─── UNENROLL ────────────────────────────────────────── */
export const unenrollCourse = async (req, res) => {
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
};