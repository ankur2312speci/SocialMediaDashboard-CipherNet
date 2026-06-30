import mongoose from "mongoose";

const callHistorySchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["voice", "video"], default: "voice" },
  status: {
    type: String,
    enum: ["completed", "rejected", "missed", "busy"],
    required: true
  },
  duration: { type: Number, default: 0 }, // Call duration in seconds
  createdAt: { type: Date, default: Date.now }
});

const CallHistory = mongoose.model("CallHistory", callHistorySchema);
export default CallHistory;
