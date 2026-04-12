import express from "express";

import {
  getContent,
  getCourseContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
} from "../controllers/contentController.js";

import { authenticateToken, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* GET /api/content */
router.get("/", authenticateToken, getContent);

/* GET /api/content/course/:courseId */
router.get("/course/:courseId", authenticateToken, getCourseContent);

/* GET /api/content/:id */
router.get("/:id", authenticateToken, getContentById);

/* POST /api/content — admin or instructor */
router.post(
  "/",
  authenticateToken,
  authorize(["admin", "instructor"]),
  upload.single("file"),
  createContent
);

/* PUT /api/content/:id — admin or instructor */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  updateContent
);

/* DELETE /api/content/:id — admin or instructor */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  deleteContent
);

export default router;