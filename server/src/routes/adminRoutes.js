import express from "express";
import {
  getAdminStats,
  getDashboard,
  getAnalytics,
  getFeesStats,
  getSettings,
  saveSettings,
} from "../controllers/adminController.js";
import { authenticateToken, authorize } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken, authorize(["admin"]));

router.get("/stats",       getAdminStats);
router.get("/dashboard",   getDashboard);
router.get("/analytics",   getAnalytics);
router.get("/fees-stats",  getFeesStats);
router.get("/settings",    getSettings);
router.post("/settings",   saveSettings);

export default router;