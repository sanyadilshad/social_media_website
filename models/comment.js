const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comments: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

module.exports = commentSchema;
