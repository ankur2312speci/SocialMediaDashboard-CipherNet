import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: false }, // optional for OAuth users
  name: { type: String, default: "" },
  avatar: { type: String, default: "" },
  cover: { type: String, default: "" },
  bio: { type: String, default: "" },
  profession: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  provider: { type: String, default: "email" }, // "email", "google", "github"
  providerId: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  isVerified: { type: Boolean, default: false },
  publicKey: { type: String, default: "" }, // ECDH E2EE Public key
  joinedDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
export default User;
