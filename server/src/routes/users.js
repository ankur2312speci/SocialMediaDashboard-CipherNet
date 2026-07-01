import express from "express";
import User from "../models/User.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// Search users
router.get("/search", authenticateJWT, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } }
      ]
    }).select("-password").limit(10);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Suggested Users
router.get("/suggested", authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // Exclude current user and already followed users
    const excludedIds = [currentUserId, ...currentUser.following];

    const suggested = await User.find({ _id: { $nin: excludedIds } })
      .select("-password")
      .limit(5);

    res.json(suggested);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get("/profile/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("followers", "username name avatar isVerified profession")
      .populate("following", "username name avatar isVerified profession");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile by username
router.get("/profile/:username", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("-password")
      .populate("followers", "username name avatar isVerified profession")
      .populate("following", "username name avatar isVerified profession");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile by ID
router.get("/profile-by-id/:userId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate("followers", "username name avatar isVerified profession")
      .populate("following", "username name avatar isVerified profession");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit profile
router.put("/profile/edit", authenticateJWT, async (req, res) => {
  try {
    const { name, bio, website, location, avatar, cover } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (cover !== undefined) updateData.cover = cover;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow User
router.post("/follow/:id", authenticateJWT, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser.following.some(id => id.toString() === targetUserId)) {
      return res.status(400).json({ error: "Already following this user" });
    }

    // Add to following/followers list
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.json({ message: `Successfully followed ${targetUser.username}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unfollow User
router.post("/unfollow/:id", authenticateJWT, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!currentUser.following.some(id => id.toString() === targetUserId)) {
      return res.status(400).json({ error: "Not following this user" });
    }

    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.json({ message: `Successfully unfollowed ${targetUser.username}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// E2EE PUBLIC KEY UPLOAD
router.post("/public-key", authenticateJWT, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: "Public key required" });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { publicKey }, { new: true }).select("-password");
    res.json({ message: "E2EE Public key uploaded successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// E2EE GET USER PUBLIC KEY
router.get("/public-key/:userId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("publicKey username");
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.publicKey) return res.status(404).json({ error: "E2EE is not activated for this user yet" });
    res.json({ userId: user._id, publicKey: user.publicKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Bookmark
router.post("/bookmark/:postId", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isBookmarked = user.bookmarks.some(id => id.toString() === req.params.postId);
    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== req.params.postId);
    } else {
      user.bookmarks.push(req.params.postId);
    }

    await user.save();
    res.json({ message: isBookmarked ? "Bookmark removed" : "Post bookmarked", isBookmarked: !isBookmarked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Bookmarked Posts
router.get("/bookmarks", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "bookmarks",
      populate: { path: "user", select: "username name avatar isVerified" }
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.bookmarks || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
