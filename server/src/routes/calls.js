import express from "express";
import CallHistory from "../models/CallHistory.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// GET CALL HISTORY
router.get("/history", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
    .populate("caller", "username name avatar")
    .populate("receiver", "username name avatar")
    .sort({ createdAt: -1 })
    .limit(30);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOG CALL RECORD
router.post("/log", authenticateJWT, async (req, res) => {
  try {
    const { receiverId, type, status, duration } = req.body;
    if (!receiverId || !status) {
      return res.status(400).json({ error: "Receiver ID and Call Status are required" });
    }

    const logEntry = new CallHistory({
      caller: req.user.id,
      receiver: receiverId,
      type: type || "voice",
      status,
      duration: duration || 0
    });

    await logEntry.save();
    const populated = await CallHistory.findById(logEntry._id)
      .populate("caller", "username name avatar")
      .populate("receiver", "username name avatar");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
