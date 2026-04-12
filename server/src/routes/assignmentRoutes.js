import express from "express";

import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignmentController.js";

import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

/* GET /api/assignments */
router.get("/", authenticateToken, getAssignments);

/* GET /api/assignments/:id */
router.get("/:id", authenticateToken, getAssignmentById);

/* POST /api/assignments — admin or instructor */
router.post(
  "/",
  authenticateToken,
  authorize(["admin", "instructor"]),
  createAssignment
);

/* PUT /api/assignments/:id — admin or instructor */
router.put(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  updateAssignment
);

/* DELETE /api/assignments/:id — admin or instructor */
router.delete(
  "/:id",
  authenticateToken,
  authorize(["admin", "instructor"]),
  deleteAssignment
);

export default router;