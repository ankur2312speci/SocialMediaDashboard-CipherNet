import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import crypto from "crypto";

// Import Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import chatRoutes from "./routes/chat.js";
import storyRoutes from "./routes/stories.js";
import notificationRoutes from "./routes/notifications.js";
import callRoutes from "./routes/calls.js";

// Models (needed for socket database operations)
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import User from "./models/User.js";

// Import Seeder
import { seedDatabase } from "./config/seeder.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, customize this to your client URL
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/social_dashboard";

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased threshold for robust testing
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// Database Connection
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB successfully!");
    await seedDatabase();

    // Migration: Ensure all seeded users have valid E2EE public keys
    try {
      const usersWithoutKeys = await User.find({ 
        publicKey: { $in: ["", null] }
      });
      if (usersWithoutKeys.length > 0) {
        console.log(`Database Migration: Generating valid E2EE public keys for ${usersWithoutKeys.length} users...`);
        for (let u of usersWithoutKeys) {
          const { publicKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'P-256'
          });
          const publicKeyJWK = publicKey.export({ format: 'jwk' });
          u.publicKey = JSON.stringify(publicKeyJWK);
          await u.save();
        }
        console.log("Database Migration: Completed E2EE public key population successfully.");
      }
    } catch (migErr) {
      console.error("Database Migration failed:", migErr.message);
    }
  })
  .catch((err) => {
    console.error("=========================================");
    console.error("WARNING: MongoDB connection failed.");
    console.error(err.message);
    console.error("Make sure your local MongoDB service is running, or specify MONGO_URI in a .env file.");
    console.error("The server will run, but database actions will fail.");
    console.error("=========================================");
  });

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calls", callRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Social Media Dashboard API Server is running!" });
});

// socket.io connection tracking
const onlineUsers = new Map(); // Map of userId -> socketId
const socketToUser = new Map(); // Map of socketId -> userId

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User Join
  socket.on("join", async (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socketToUser.set(socket.id, userId);
    
    // Broadcast user online status
    io.emit("user-status", { userId, status: "online" });
    console.log(`User ${userId} joined on socket ${socket.id}`);
    
    // Send list of all currently online users to the caller
    socket.emit("online-list", Array.from(onlineUsers.keys()));
  });

  // Typing Indicators
  socket.on("typing", ({ senderId, receiverId, groupId }) => {
    if (groupId) {
      // Broadcast typing to group members
      socket.to(groupId).emit("user-typing", { userId: senderId, groupId });
    } else if (receiverId) {
      const recSocket = onlineUsers.get(receiverId);
      if (recSocket) {
        io.to(recSocket).emit("user-typing", { userId: senderId });
      }
    }
  });

  socket.on("stop-typing", ({ senderId, receiverId, groupId }) => {
    if (groupId) {
      socket.to(groupId).emit("user-stop-typing", { userId: senderId, groupId });
    } else if (receiverId) {
      const recSocket = onlineUsers.get(receiverId);
      if (recSocket) {
        io.to(recSocket).emit("user-stop-typing", { userId: senderId });
      }
    }
  });

  // Direct Message E2EE Sending
  socket.on("send-message", async (msgData) => {
    const { senderId, receiverId, groupId, ciphertext, iv, media, replyToId } = msgData;

    try {
      // Save encrypted message to DB
      const newMsg = new Message({
        sender: senderId,
        receiver: receiverId || null,
        group: groupId || null,
        ciphertext,
        iv,
        media: media || [],
        replyTo: replyToId || null,
        status: receiverId && onlineUsers.has(receiverId) ? "delivered" : "sent"
      });

      await newMsg.save();
      
      const populatedMsg = await Message.findById(newMsg._id)
        .populate("sender", "username name avatar")
        .populate("receiver", "username name avatar");

      // Deliver via Socket.io
      if (groupId) {
        // Group chat delivery
        socket.to(groupId).emit("receive-message", populatedMsg);
      } else if (receiverId) {
        // Direct chat delivery
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive-message", populatedMsg);
        }
        
        // Notify sender of delivery/status
        socket.emit("message-sent-acknowledgment", populatedMsg);

        // Real-Time Notification for message (if receiver is not currently viewing messages)
        const notif = new Notification({
          sender: senderId,
          receiver: receiverId,
          type: "message",
          content: "sent you a secure message",
          isRead: false
        });
        await notif.save();
        
        const populatedNotif = await Notification.findById(notif._id)
          .populate("sender", "username name avatar");

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive-notification", populatedNotif);
        }
      }
    } catch (err) {
      console.error("Error processing socket send-message:", err.message);
    }
  });

  // Message Read Status Receipt
  socket.on("mark-read", async ({ messageIds, senderId, readerId }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: "read" } }
      );

      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages-read-update", { messageIds, readerId });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Notifications (Follow, Like, Comment)
  socket.on("send-notification", async ({ senderId, receiverId, type, postId, content }) => {
    if (senderId === receiverId) return;

    try {
      const notif = new Notification({
        sender: senderId,
        receiver: receiverId,
        type,
        post: postId || null,
        content: content || "",
        isRead: false
      });
      await notif.save();

      const populatedNotif = await Notification.findById(notif._id)
        .populate("sender", "username name avatar")
        .populate("post", "content media");

      const recSocket = onlineUsers.get(receiverId);
      if (recSocket) {
        io.to(recSocket).emit("receive-notification", populatedNotif);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Real-Time Sockets for Likes, Comments, Follows
  socket.on("post-like", ({ postId, userId, isLiked, likesCount }) => {
    socket.broadcast.emit("post-liked-update", { postId, userId, isLiked, likesCount });
  });

  socket.on("post-comment", ({ postId, comment }) => {
    socket.broadcast.emit("post-commented-update", { postId, comment });
  });

  socket.on("user-follow", ({ followerId, followingId, followersCount, followingCount }) => {
    socket.broadcast.emit("user-followed-update", { followerId, followingId, followersCount, followingCount });
  });

  // ==========================================
  // WebRTC Voice / Video Call Signaling
  // ==========================================
  
  // Call Initial User
  socket.on("call-user", ({ userToCall, signalData, from, type }) => {
    const receiverSocket = onlineUsers.get(userToCall);
    if (receiverSocket) {
      console.log(`Forwarding incoming call from ${from} to socket ${receiverSocket}`);
      io.to(receiverSocket).emit("incoming-call", {
        signal: signalData,
        from,
        type // 'voice' or 'video'
      });
    } else {
      socket.emit("call-failed", { reason: "User is offline" });
    }
  });

  // Answer Call Signal
  socket.on("answer-call", ({ signal, to }) => {
    const callerSocket = onlineUsers.get(to);
    if (callerSocket) {
      console.log(`Forwarding call answer back to caller ${to}`);
      io.to(callerSocket).emit("call-accepted", { signal });
    }
  });

  // Ice Candidate Exchange
  socket.on("ice-candidate", ({ candidate, to }) => {
    const peerSocket = onlineUsers.get(to);
    if (peerSocket) {
      io.to(peerSocket).emit("ice-candidate", { candidate });
    }
  });

  // Reject / Busy Call Signal
  socket.on("reject-call", ({ to, reason }) => {
    const callerSocket = onlineUsers.get(to);
    if (callerSocket) {
      io.to(callerSocket).emit("call-rejected", { reason: reason || "declined" });
    }
  });

  // Hangup / End Call
  socket.on("end-call", ({ to }) => {
    const peerSocket = onlineUsers.get(to);
    if (peerSocket) {
      io.to(peerSocket).emit("call-ended");
    }
  });

  // User Disconnect
  socket.on("disconnect", () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      socketToUser.delete(socket.id);
      
      // Broadcast offline status
      io.emit("user-status", { userId, status: "offline" });
      console.log(`User ${userId} disconnected`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket Server is listening...`);
  console.log(`=========================================`);
});
