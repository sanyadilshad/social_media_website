const mongoose = require("mongoose");
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    imagePath: { type: String, required: false },
    videoPath: { type: String, required: false },
    bgColor: {type:String},
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    comments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: [] },
    ],
  },
  { timestamps: true }
);

module.exports = postSchema;
