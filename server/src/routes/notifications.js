import express from "express";
import Notification from "../models/Notification.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// GET NOTIFICATIONS
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const notifications = await Notification.find({ receiver: req.user.id })
      .populate("sender", "username name avatar")
      .populate("post", "content media")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MARK ALL AS READ
router.post("/read", authenticateJWT, async (req, res) => {
  try {
    await Notification.updateMany(
      { receiver: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MARK SPECIFIC AS READ
router.post("/:id/read", authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
