const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name: { type: String },
    phone: { type: String, required: true },
    gender: { type: String },
    dob: { type: Date },
    bio: { type: String, default: "" },
    location: { type: String },
    interests: [String],
    picture: {
      type: String,
      default: "/images/user.png",
    },
    friends: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    friendRequests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    sockets: [{ type: String, default: [] }],
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = userSchema;
