import express from "express";
import Notification from "../models/Notification.js";
import { authenticateToken, authorize } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/* ─── GET MY NOTIFICATIONS ────────────────────────────── */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter = { recipient: req.user._id };
    if (req.query.unread === "true") filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({ notifications, total, unreadCount, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FIX: /read-all MUST be registered before /:id/read
// Otherwise Express matches "read-all" as an :id param
/* ─── MARK ALL AS READ ────────────────────────────────── */
router.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── MARK AS READ ────────────────────────────────────── */
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── DELETE ONE ──────────────────────────────────────── */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── ADMIN: SEND BROADCAST ───────────────────────────── */
router.post(
  "/broadcast",
  authenticateToken,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { title, message, type = "announcement", roles, link = "" } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }

      const filter = {};
      if (roles?.length) filter.role = { $in: roles };

      const users = await User.find(filter).select("_id");
      if (!users.length) {
        return res.status(400).json({ error: "No recipients found" });
      }

      const notifications = users.map((u) => ({
        recipient: u._id,
        title,
        message,
        type,
        link,
      }));

      await Notification.insertMany(notifications);
      res.json({ ok: true, sent: notifications.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/* ─── HELPER: create notification (used internally) ─── */
export const createNotification = async ({
  recipientId,
  title,
  message,
  type = "system",
  link = "",
}) => {
  try {
    await Notification.create({ recipient: recipientId, title, message, type, link });
  } catch {
    // Never let notification errors crash other flows
  }
};

export default router;