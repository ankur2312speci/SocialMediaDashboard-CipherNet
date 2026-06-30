import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "comment", "follow", "message", "call"],
    required: true
  },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  content: { type: String, default: "" }, // Optional text
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
