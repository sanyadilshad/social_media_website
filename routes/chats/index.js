const express = require("express");
const { verifyTokenReq } = require("../../misc");
const { User, ChatSession, ChatHistory } = require("../../models");
const router = express.Router();

router.get("/chats", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "username picture")
    .exec();
  res.render("chatSelect", { user });
});

router.get("/chats/:username", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "username picture")
    .populate("friendRequests", "username picture")
    .exec();
  const friend = await User.findOne({ username: req.params.username });
  let session = await ChatSession.findOne({
    users: { $all: [user.id, friend.id] },
  });
  let chatHistory = [];
  if (!session) {
    session = await ChatSession.create({
      roomId: user.username + "@" + friend.username,
      status: "offline",
      users: [user.id, friend.id],
    });
  } else {
    chatHistory = await ChatHistory.find({ sessionId: session._id })
      .populate("user", "username picture")
      .exec();
  }

  console.log("Chat Session Record", session);
  res.render("chat", {
    user,
    friend,
    session,
    chatHistory: chatHistory || [],
  });
});

module.exports = router;
