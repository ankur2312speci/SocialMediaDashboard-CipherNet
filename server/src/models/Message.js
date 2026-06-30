import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For 1-to-1 chats
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For group chats
  ciphertext: { type: String, required: true }, // Encrypted payload
  iv: { type: String, required: true }, // Initialization vector (nonce) for AES-GCM
  media: [
    {
      url: { type: String },
      fileType: { type: String }, // 'image', 'video', 'voice', 'document'
      name: { type: String }
    }
  ],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String }
    }
  ],
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
  },
  isEdited: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null }, // For self-destructing messages
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
