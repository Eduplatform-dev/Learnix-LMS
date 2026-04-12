import express from "express";
import { z } from "zod";
import Discussion from "../models/Discussion.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const discussionSchema = z.object({
  course:   z.string().min(1),
  lesson:   z.string().optional().nullable().default(null),
  title:    z.string().min(1).max(200).trim(),
  content:  z.string().min(1).max(5000).trim(),
  type:     z.enum(["question","discussion","announcement","resource"]).optional().default("discussion"),
  tags:     z.array(z.string().max(30)).optional().default([]),
});

const replySchema = z.object({
  content: z.string().min(1).max(3000).trim(),
});

// GET discussions for a course
router.get("/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const filter = { course: courseId };
    if (req.query.lesson)     filter.lesson = req.query.lesson;
    if (req.query.type)       filter.type   = req.query.type;
    if (req.query.resolved !== undefined) filter.isResolved = req.query.resolved === "true";

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [discussions, total] = await Promise.all([
      Discussion.find(filter)
        .populate("author", "username role")
        .populate("replies.author", "username role")
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Discussion.countDocuments(filter),
    ]);

    // Increment views done server-side for simplicity
    res.json({ discussions, total, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single discussion
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const disc = await Discussion.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "username role")
      .populate("replies.author", "username role");
    if (!disc) return res.status(404).json({ error: "Discussion not found" });
    res.json(disc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE discussion
router.post("/", authenticateToken, async (req, res) => {
  try {
    const parsed = discussionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const disc = await Discussion.create({
      ...parsed.data,
      author: req.user._id,
    });
    const populated = await disc.populate("author", "username role");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD REPLY
router.post("/:id/replies", authenticateToken, async (req, res) => {
  try {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ error: "Discussion not found" });

    disc.replies.push({
      author: req.user._id,
      content: parsed.data.content,
      isInstructor: req.user.role === "instructor",
    });
    await disc.save();
    await disc.populate("replies.author", "username role");

    res.status(201).json(disc.replies[disc.replies.length - 1]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIKE discussion
router.patch("/:id/like", authenticateToken, async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ error: "Discussion not found" });

    const userId = String(req.user._id);
    const liked  = disc.likes.map(String).includes(userId);

    if (liked) disc.likes = disc.likes.filter(id => String(id) !== userId);
    else       disc.likes.push(req.user._id);

    await disc.save();
    res.json({ liked: !liked, likeCount: disc.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MARK RESOLVED (author or instructor/admin)
router.patch("/:id/resolve", authenticateToken, async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ error: "Discussion not found" });

    const isOwner = String(disc.author) === String(req.user._id);
    const isStaff = ["admin","instructor"].includes(req.user.role);

    if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });

    disc.isResolved = !disc.isResolved;
    await disc.save();
    res.json({ isResolved: disc.isResolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PIN/UNPIN (instructor/admin)
router.patch("/:id/pin", authenticateToken, async (req, res) => {
  try {
    if (!["admin","instructor"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ error: "Discussion not found" });

    disc.isPinned = !disc.isPinned;
    await disc.save();
    res.json({ isPinned: disc.isPinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE discussion
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const disc = await Discussion.findById(req.params.id);
    if (!disc) return res.status(404).json({ error: "Discussion not found" });

    const isOwner = String(disc.author) === String(req.user._id);
    const isStaff = ["admin","instructor"].includes(req.user.role);

    if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });
    await disc.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
