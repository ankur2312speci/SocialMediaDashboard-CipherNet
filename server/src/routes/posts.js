import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// CREATE POST
router.post("/", authenticateJWT, async (req, res) => {
  try {
    const { content, media, poll, isDraft, scheduledFor } = req.body;
    
    let pollData = null;
    if (poll && poll.question && poll.options && poll.options.length >= 2) {
      pollData = {
        question: poll.question,
        options: poll.options.map(opt => ({ text: opt, votes: [] })),
        expiresAt: poll.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
      };
    }

    const newPost = new Post({
      user: req.user.id,
      content: content || "",
      media: media || [],
      poll: pollData,
      isDraft: isDraft || false,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    });

    await newPost.save();
    const populated = await Post.findById(newPost._id).populate("user", "username name avatar isVerified");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET FEED (Posts from following users + own posts)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // Include self + followed users
    let query = {
      isDraft: false,
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } }
      ]
    };

    // If following list is populated, show only followed posts. Otherwise show global feed as a fallback
    if (currentUser.following && currentUser.following.length > 0) {
      query.user = { $in: [currentUserId, ...currentUser.following] };
    }

    const feedPosts = await Post.find(query)
    .populate("user", "username name avatar isVerified")
    .populate("comments.user", "username name avatar")
    .populate("comments.replies.user", "username name avatar")
    .sort({ createdAt: -1 })
    .limit(30);

    // If feed is empty, fallback to explore posts
    if (feedPosts.length === 0) {
      const explorePosts = await Post.find({
        isDraft: false,
        $or: [
          { scheduledFor: null },
          { scheduledFor: { $lte: new Date() } }
        ]
      })
      .populate("user", "username name avatar isVerified")
      .populate("comments.user", "username name avatar")
      .populate("comments.replies.user", "username name avatar")
      .sort({ createdAt: -1 })
      .limit(30);

      return res.json(explorePosts);
    }

    res.json(feedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET EXPLORE (Trending / all public posts sorted by likes/date)
router.get("/explore", authenticateJWT, async (req, res) => {
  try {
    const explorePosts = await Post.find({
      isDraft: false,
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } }
      ]
    })
    .populate("user", "username name avatar isVerified")
    .populate("comments.user", "username name avatar")
    .populate("comments.replies.user", "username name avatar")
    .sort({ createdAt: -1 }) // We can sort by likes count, but date is fine for mock
    .limit(30);

    res.json(explorePosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET DRAFTS
router.get("/drafts", authenticateJWT, async (req, res) => {
  try {
    const drafts = await Post.find({ user: req.user.id, isDraft: true })
      .populate("user", "username name avatar isVerified")
      .sort({ createdAt: -1 });
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET SCHEDULED
router.get("/scheduled", authenticateJWT, async (req, res) => {
  try {
    const scheduled = await Post.find({
      user: req.user.id,
      isDraft: false,
      scheduledFor: { $gt: new Date() }
    })
    .populate("user", "username name avatar isVerified")
    .sort({ scheduledFor: 1 });
    res.json(scheduled);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET USER'S POSTS BY USERNAME
router.get("/user/:username", authenticateJWT, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Build query: hide drafts & scheduled unless viewing own profile
    const query = { user: targetUser._id };
    if (req.user.id !== targetUser._id.toString()) {
      query.isDraft = false;
      query.$or = [
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } }
      ];
    }

    const posts = await Post.find(query)
      .populate("user", "username name avatar isVerified")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE LIKE
router.post("/:id/like", authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const isLiked = post.likes.includes(req.user.id);
    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ likesCount: post.likes.length, isLiked: !isLiked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD COMMENT
router.post("/:id/comment", authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Comment text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const newComment = {
      user: req.user.id,
      content,
      likes: [],
      replies: []
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("comments.user", "username name avatar")
      .populate("comments.replies.user", "username name avatar");

    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];
    res.json(addedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REPLY TO COMMENT
router.post("/:id/comment/:commentId/reply", authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Reply text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.replies.push({
      user: req.user.id,
      content,
      likes: []
    });

    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("comments.user", "username name avatar")
      .populate("comments.replies.user", "username name avatar");

    const updatedComment = updatedPost.comments.id(req.params.commentId);
    res.json(updatedComment.replies[updatedComment.replies.length - 1]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VOTE IN POLL
router.post("/:id/vote", authenticateJWT, async (req, res) => {
  try {
    const { optionId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ error: "Poll post not found" });

    // Check if poll expired
    if (post.poll.expiresAt && new Date() > new Date(post.poll.expiresAt)) {
      return res.status(400).json({ error: "Poll has expired" });
    }

    // Check if user voted in any option already
    post.poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(userId => userId.toString() !== req.user.id);
    });

    // Add vote to chosen option
    const option = post.poll.options.id(optionId);
    if (!option) return res.status(400).json({ error: "Invalid option" });
    
    option.votes.push(req.user.id);

    await post.save();
    
    const populated = await Post.findById(post._id).populate("user", "username name avatar");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE POST
router.delete("/:id", authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EDIT COMMENT
router.put("/:id/comment/:commentId", authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Comment text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    comment.content = content;
    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("comments.user", "username name avatar")
      .populate("comments.replies.user", "username name avatar");

    res.json(updatedPost.comments.id(req.params.commentId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE COMMENT
router.delete("/:id/comment/:commentId", authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    comment.deleteOne();
    await post.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
