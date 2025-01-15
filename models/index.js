const mongoose = require("mongoose");
const userSchema = require("./user");
const postSchema = require("./post");
const commentSchema = require("./comment");
const { chatSession, chatSchema } = require("./chat");
const notificationSchema = require("./notification");

mongoose
  .connect("mongodb://127.0.0.1:27017/friendzy", {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Connection error", err);
  });

module.exports = {
  User: mongoose.model("User", userSchema),
  Post: mongoose.model("Post", postSchema),
  Comment: mongoose.model("Comment", commentSchema),
  ChatSession: mongoose.model("ChatSession", chatSession),
  Notification: mongoose.model("Notification", notificationSchema),
  ChatHistory: mongoose.model("ChatHistory", chatSchema),
};
