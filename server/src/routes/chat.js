import express from "express";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

// GET CONVERSATIONS LIST (Direct messages & Groups)
router.get("/conversations", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all direct messages involving current user
    const directMessages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .populate("sender", "username name avatar")
    .populate("receiver", "username name avatar");

    // Track unique conversation contacts and their latest message
    const conversationsMap = {};

    directMessages.forEach(msg => {
      const contact = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      if (!contact) return; // Skip if receiver is null (e.g. group message)

      const contactId = contact._id.toString();
      if (!conversationsMap[contactId]) {
        conversationsMap[contactId] = {
          type: "direct",
          contact: {
            id: contact._id,
            username: contact.username,
            name: contact.name,
            avatar: contact.avatar
          },
          lastMessage: {
            id: msg._id,
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            status: msg.status,
            sender: msg.sender._id,
            createdAt: msg.createdAt
          },
          unreadCount: 0
        };
      }
      
      // Calculate unread count
      if (msg.receiver && msg.receiver._id.toString() === userId && msg.status !== "read") {
        conversationsMap[contactId].unreadCount++;
      }
    });

    // Find group chats for this user
    const groups = await Group.find({ members: userId });
    const groupConversations = await Promise.all(groups.map(async grp => {
      const lastGroupMsg = await Message.findOne({ group: grp._id })
        .sort({ createdAt: -1 })
        .populate("sender", "username name avatar");

      return {
        type: "group",
        contact: {
          id: grp._id,
          name: grp.name,
          avatar: grp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(grp.name)}&background=random&color=fff`,
          members: grp.members
        },
        lastMessage: lastGroupMsg ? {
          id: lastGroupMsg._id,
          ciphertext: lastGroupMsg.ciphertext,
          iv: lastGroupMsg.iv,
          status: lastGroupMsg.status,
          senderName: lastGroupMsg.sender.username,
          sender: lastGroupMsg.sender._id,
          createdAt: lastGroupMsg.createdAt
        } : null,
        unreadCount: 0 // Mocked group unread count
      };
    }));

    const directList = Object.values(conversationsMap);
    const combinedList = [...directList, ...groupConversations].sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return bTime - aTime;
    });

    res.json(combinedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET DIRECT MESSAGES WITH USER
router.get("/messages/:contactId", authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = req.params.contactId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: contactId },
        { sender: contactId, receiver: currentUserId }
      ]
    })
    .populate("sender", "username name avatar")
    .populate("receiver", "username name avatar")
    .sort({ createdAt: 1 });

    // Mark these messages as read
    await Message.updateMany(
      { sender: contactId, receiver: currentUserId, status: { $ne: "read" } },
      { $set: { status: "read" } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET GROUP MESSAGES
router.get("/group-messages/:groupId", authenticateJWT, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Check if user is member
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const messages = await Message.find({ group: groupId })
      .populate("sender", "username name avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE GROUP CHAT
router.post("/groups", authenticateJWT, async (req, res) => {
  try {
    const { name, members, avatar } = req.body;
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ error: "Group name and members are required" });
    }

    // Creator is member too
    const uniqueMembers = Array.from(new Set([req.user.id, ...members]));

    const newGroup = new Group({
      name,
      avatar: avatar || "",
      creator: req.user.id,
      members: uniqueMembers
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
