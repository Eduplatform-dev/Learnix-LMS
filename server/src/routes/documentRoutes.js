import express from "express";
import path from "node:path";
import fs from "node:fs";
import Document from "../models/Document.js";
import Notification from "../models/Notification.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { env } from "../config/env.js";

const router = express.Router();
const baseUrl = (req) => env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

/* ── GET my documents (student) ───────────────────────── */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const docs = await Document.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET all documents (admin) ────────────────────────── */
router.get("/", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)  filter.status  = req.query.status;
    if (req.query.type)    filter.type    = req.query.type;
    if (req.query.student) filter.student = req.query.student;

    const docs = await Document.find(filter)
      .populate("student", "username email")
      .populate("verifiedBy", "username")
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET single document ──────────────────────────────── */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("student", "username email")
      .populate("verifiedBy", "username");
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const isOwner = String(doc.student._id || doc.student) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST: upload document (student) ──────────────────── */
router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const { title, type, notes, expiresAt } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const fileUrl = `${baseUrl(req)}/uploads/${req.file.filename}`;

    const doc = await Document.create({
      student:  req.user._id,
      title:    title.trim(),
      type:     type || "other",
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      notes:    notes || "",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status:   "pending",
    });

    // Notify admin
    const adminUsers = await (await import("../models/User.js")).default.find({ role: "admin" }).select("_id");
    for (const admin of adminUsers) {
      await Notification.create({
        recipient: admin._id,
        title:     "New Document Uploaded",
        message:   `${req.user.username} uploaded a new ${type || "document"}: "${title}"`,
        type:      "system",
        link:      "/admin/documents",
      });
    }

    res.status(201).json(doc);
  } catch (err) {
    console.error("uploadDocument error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── PATCH: verify / reject (admin) ──────────────────── */
router.patch("/:id/verify", authenticateToken, authorize(["admin"]), async (req, res) => {
  try {
    const { status, rejectionNote } = req.body;
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status,
        verifiedBy:    req.user._id,
        verifiedAt:    new Date(),
        rejectionNote: rejectionNote || "",
      },
      { new: true }
    ).populate("student", "username email _id");

    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Notify student
    await Notification.create({
      recipient: doc.student._id,
      title:     status === "verified" ? "Document Verified ✅" : "Document Rejected ❌",
      message:   status === "verified"
        ? `Your document "${doc.title}" has been verified.`
        : `Your document "${doc.title}" was rejected. Reason: ${rejectionNote || "Not specified"}`,
      type:      "system",
      link:      "/dashboard/documents",
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE ───────────────────────────────────────────── */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const isOwner = String(doc.student) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    if (doc.status === "verified" && req.user.role !== "admin") {
      return res.status(400).json({ error: "Cannot delete a verified document" });
    }

    // Delete file from disk
    const filename = doc.fileUrl.split("/uploads/")[1];
    if (filename) {
      const fullPath = path.resolve(process.cwd(), "uploads", filename);
      try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
    }

    await doc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
