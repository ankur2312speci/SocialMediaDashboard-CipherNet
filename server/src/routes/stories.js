import express from "express";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// CREATE STORY
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { media, caption } = req.body;
    if (!media) return res.status(400).json({ error: "Story media URL is required" });

    const newStory = new Story({
      user: req.user.id,
      media,
      caption: caption || ""
    });

    await newStory.save();
    
    const populated = await Story.findById(newStory._id)
      .populate("user", "username name avatar");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET FEED STORIES (Active stories of self + followed users)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const targetUsers = [currentUserId, ...currentUser.following];

    const activeStories = await Story.find({
      user: { $in: targetUsers },
      expiresAt: { $gt: new Date() }
    })
    .populate("user", "username name avatar")
    .sort({ createdAt: 1 });

    // Group stories by user
    const groupedStories = {};
    activeStories.forEach(story => {
      const uId = story.user._id.toString();
      if (!groupedStories[uId]) {
        groupedStories[uId] = {
          user: story.user,
          stories: []
        };
      }
      groupedStories[uId].stories.push({
        id: story._id,
        media: story.media,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt
      });
    });

    // Convert grouped map to array, keeping current user first if they have stories
    const result = Object.values(groupedStories);
    const selfGroupIndex = result.findIndex(group => group.user._id.toString() === currentUserId);
    
    if (selfGroupIndex > 0) {
      const selfGroup = result.splice(selfGroupIndex, 1)[0];
      result.unshift(selfGroup);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
