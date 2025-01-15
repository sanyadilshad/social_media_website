const mongoose = require("mongoose");

const chatSession = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["offline", "online", "archive"] },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
    },
    message: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", require: true },
  },
  { timestamps: true }
);

module.exports = { chatSession, chatSchema };

/**
 * UserId = session for user
 * Sockets = for the user where user logged in (for multiple device login)
 * Rooms = the user member
 */
