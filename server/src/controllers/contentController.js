import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import Content from "../models/Content.js";
import { env } from "../config/env.js";

const baseUrl = (req) =>
  env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

/* ================= GET ALL CONTENT ================= */
export const getContent = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.type)   filter.type   = req.query.type;
    if (req.query.course) filter.course = req.query.course;

    // Instructors see only their own content
    if (req.user?.role === "instructor") {
      filter.uploadedBy = req.user._id;
    }

    const [items, total] = await Promise.all([
      Content.find(filter)
        .populate("uploadedBy", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Content.countDocuments(filter),
    ]);

    res.json(items);
  } catch (err) {
    console.error("getContent error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= GET CONTENT BY COURSE ================= */
export const getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;

    const items = await Content.find({ course: courseId })
      .populate("uploadedBy", "username email")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("getCourseContent error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= GET CONTENT BY ID ================= */
export const getContentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid content ID" });
    }

    const item = await Content.findById(id).populate("uploadedBy", "username email");

    if (!item) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("getContentById error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= CREATE CONTENT ================= */
export const createContent = async (req, res) => {
  try {
    const { title, type, course, folder } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!type || !["video", "pdf", "image"].includes(type)) {
      return res.status(400).json({ error: "Type must be video, pdf, or image" });
    }

    let url = req.body.url || "";
    let filePath = null;

    if (req.file) {
      filePath = req.file.filename;
      url = `${baseUrl(req)}/uploads/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({ error: "Either a file upload or a URL is required" });
    }

    const item = await Content.create({
      title:      title.trim(),
      type,
      url,
      course:     course || null,
      folder:     folder || null,
      uploadedBy: req.user._id,
      filePath,
    });

    res.status(201).json(item);
  } catch (err) {
    console.error("createContent error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= UPDATE CONTENT ================= */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid content ID" });
    }

    const existing = await Content.findById(id);
    if (!existing) return res.status(404).json({ error: "Content not found" });

    // Instructors can only update their own content
    if (
      req.user.role === "instructor" &&
      String(existing.uploadedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "You can only update your own content" });
    }

    const allowed = ["title", "course", "folder"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = typeof req.body[key] === "string"
          ? req.body[key].trim()
          : req.body[key];
      }
    }

    const updated = await Content.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("updateContent error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ================= DELETE CONTENT ================= */
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid content ID" });
    }

    const item = await Content.findById(id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    // Instructors can only delete their own content
    if (
      req.user.role === "instructor" &&
      String(item.uploadedBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "You can only delete your own content" });
    }

    await Content.findByIdAndDelete(id);

    // Delete physical file if it was uploaded
    if (item.filePath) {
      const fullPath = path.resolve(process.cwd(), "uploads", item.filePath);
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {
        // Ignore missing file errors
      }
    }

    res.json({ message: "Content deleted successfully" });
  } catch (err) {
    console.error("deleteContent error:", err);
    res.status(500).json({ error: "Server error" });
  }
};