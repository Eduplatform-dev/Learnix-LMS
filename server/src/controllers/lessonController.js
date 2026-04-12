import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";
import Progress from "../models/Progress.js";
import { env } from "../config/env.js";

const baseUrl = (req) =>
  env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(2000).optional().default(""),
  type: z.enum(["video", "pdf", "text", "quiz"]).default("video"),
  contentUrl: z.string().optional().default(""),
  textContent: z.string().optional().default(""),
  duration: z.coerce.number().optional().default(0),
  isPreview: z.boolean().optional().default(false),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()),
        correctIndex: z.number(),
      })
    )
    .optional()
    .default([]),
});

/* ─── GET LESSONS FOR A COURSE ─────────────────────────── */
export const getLessons = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const lessons = await Lesson.find({ course: courseId })
      .sort({ order: 1 })
      .lean();

    // Attach progress if student
    if (req.user?.role === "student") {
      const progress = await Progress.findOne({
        student: req.user._id,
        course: courseId,
      }).lean();

      const completedSet = new Set(
        (progress?.completedLessons || []).map(String)
      );

      const lastLessonId = progress?.lastLesson
        ? String(progress.lastLesson)
        : null;

      return res.json({
        lessons: lessons.map((l) => ({
          ...l,
          completed: completedSet.has(String(l._id)),
        })),
        progress: {
          completedCount: completedSet.size,
          total: lessons.length,
          percent:
            lessons.length === 0
              ? 0
              : Math.round((completedSet.size / lessons.length) * 100),
          lastLessonId,
          completedAt: progress?.completedAt || null,
        },
      });
    }

    res.json({ lessons, progress: null });
  } catch (err) {
    console.error("getLessons error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET SINGLE LESSON ─────────────────────────────────── */
export const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson ID" });
    }

    const lesson = await Lesson.findById(id).lean();
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    // Non-preview lessons: only enrolled students / instructor / admin
    if (!lesson.isPreview && req.user?.role === "student") {
      const course = await Course.findById(lesson.course);
      const enrolled = course?.enrolledStudents?.some(
        (s) => String(s) === String(req.user._id)
      );
      if (!enrolled) {
        return res.status(403).json({ error: "Enroll to access this lesson" });
      }
    }

    res.json(lesson);
  } catch (err) {
    console.error("getLessonById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── CREATE LESSON ─────────────────────────────────────── */
export const createLesson = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid course ID" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Instructors can only add to their own courses
    if (
      req.user.role === "instructor" &&
      String(course.instructor) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ error: "You can only add lessons to your own courses" });
    }

    const body = { ...req.body };
    if (body.isPreview === "true") body.isPreview = true;
    if (body.isPreview === "false") body.isPreview = false;
    if (body.quiz && typeof body.quiz === "string") {
      try {
        body.quiz = JSON.parse(body.quiz);
      } catch {
        body.quiz = [];
      }
    }

    const parsed = lessonSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    let contentUrl = parsed.data.contentUrl;
    let filePath = null;

    if (req.file) {
      filePath = req.file.filename;
      contentUrl = `${baseUrl(req)}/uploads/${req.file.filename}`;
    }

    // Determine next order
    const lastLesson = await Lesson.findOne({ course: courseId })
      .sort({ order: -1 })
      .lean();
    const order = lastLesson ? lastLesson.order + 1 : 0;

    const lesson = await Lesson.create({
      ...parsed.data,
      course: courseId,
      contentUrl,
      filePath,
      order,
      uploadedBy: req.user._id,
    });

    res.status(201).json(lesson);
  } catch (err) {
    console.error("createLesson error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── UPDATE LESSON ─────────────────────────────────────── */
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson ID" });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    if (req.user.role === "instructor") {
      const course = await Course.findById(lesson.course);
      if (!course || String(course.instructor) !== String(req.user._id)) {
        return res
          .status(403)
          .json({ error: "You can only update your own lessons" });
      }
    }

    const body = { ...req.body };
    if (body.isPreview === "true") body.isPreview = true;
    if (body.isPreview === "false") body.isPreview = false;
    if (body.quiz && typeof body.quiz === "string") {
      try {
        body.quiz = JSON.parse(body.quiz);
      } catch {
        body.quiz = [];
      }
    }

    const parsed = lessonSchema.partial().safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const updates = { ...parsed.data };

    if (req.file) {
      // Delete old file
      if (lesson.filePath) {
        const old = path.resolve(process.cwd(), "uploads", lesson.filePath);
        try {
          if (fs.existsSync(old)) fs.unlinkSync(old);
        } catch {}
      }
      updates.filePath = req.file.filename;
      updates.contentUrl = `${baseUrl(req)}/uploads/${req.file.filename}`;
    }

    const updated = await Lesson.findByIdAndUpdate(id, updates, { new: true });
    res.json(updated);
  } catch (err) {
    console.error("updateLesson error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── DELETE LESSON ─────────────────────────────────────── */
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson ID" });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    if (req.user.role === "instructor") {
      const course = await Course.findById(lesson.course);
      if (!course || String(course.instructor) !== String(req.user._id)) {
        return res
          .status(403)
          .json({ error: "You can only delete your own lessons" });
      }
    }

    await Lesson.findByIdAndDelete(id);

    if (lesson.filePath) {
      const fp = path.resolve(process.cwd(), "uploads", lesson.filePath);
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch {}
    }

    // Re-order remaining lessons
    const remaining = await Lesson.find({ course: lesson.course }).sort({
      order: 1,
    });
    for (let i = 0; i < remaining.length; i++) {
      await Lesson.findByIdAndUpdate(remaining[i]._id, { order: i });
    }

    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    console.error("deleteLesson error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── REORDER LESSONS ────────────────────────────────────── */
export const reorderLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { orderedIds } = req.body; // array of lesson IDs in new order

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        Lesson.findByIdAndUpdate(id, { order: index })
      )
    );

    const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 });
    res.json(lessons);
  } catch (err) {
    console.error("reorderLessons error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── MARK LESSON COMPLETE ───────────────────────────────── */
export const markLessonComplete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson ID" });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const progress = await Progress.findOneAndUpdate(
      { student: req.user._id, course: lesson.course },
      {
        $addToSet: { completedLessons: id },
        $set: { lastLesson: id },
      },
      { upsert: true, new: true }
    );

    // Check if all lessons done
    const totalLessons = await Lesson.countDocuments({ course: lesson.course });
    if (
      progress.completedLessons.length >= totalLessons &&
      !progress.completedAt
    ) {
      progress.completedAt = new Date();
      await progress.save();
    }

    res.json({
      completedLessons: progress.completedLessons,
      completedAt: progress.completedAt,
      percent:
        totalLessons === 0
          ? 0
          : Math.round((progress.completedLessons.length / totalLessons) * 100),
    });
  } catch (err) {
    console.error("markLessonComplete error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ─── GET MY PROGRESS ─────────────────────────────────────── */
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const [progress, totalLessons] = await Promise.all([
      Progress.findOne({
        student: req.user._id,
        course: courseId,
      }).lean(),
      Lesson.countDocuments({ course: courseId }),
    ]);

    const completedCount = progress?.completedLessons?.length || 0;

    res.json({
      completedLessons: progress?.completedLessons || [],
      lastLessonId: progress?.lastLesson || null,
      completedAt: progress?.completedAt || null,
      completedCount,
      total: totalLessons,
      percent:
        totalLessons === 0
          ? 0
          : Math.round((completedCount / totalLessons) * 100),
    });
  } catch (err) {
    console.error("getCourseProgress error:", err);
    res.status(500).json({ error: "Server error" });
  }
};