import express from "express";
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  markLessonComplete,
  getCourseProgress,
} from "../controllers/lessonController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* Course-scoped lesson routes */
router.get("/course/:courseId", authenticateToken, getLessons);
router.post(
  "/course/:courseId",
  authenticateToken,
  authorize(["admin", "instructor"]),
  upload.single("file"),
  createLesson
);
router.put(
  "/course/:courseId/reorder",
  authenticateToken,
  authorize(["admin", "instructor"]),
  reorderLessons
);
router.get("/course/:courseId/my-progress", authenticateToken, getCourseProgress);

/* Single lesson routes */
router.get("/:id", authenticateToken, getLessonById);
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  upload.single("file"),
  updateLesson
);
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  deleteLesson
);
router.post("/:id/complete", authenticateToken, markLessonComplete);

export default router;