const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { Post, User, Notification } = require("./models");
const axios = require("axios");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const userRouter = require("./routes/users");
const postRouter = require("./routes/posts");
const chatRouter = require("./routes/chats");
const exploreRouter = require("./routes/explore");
const profilePicRouter = require("./routes/profilePic");

const { verifyTokenReq, verifyToken } = require("./misc");
const { initSockets } = require("./misc/server-socket");

const httpServer = http.createServer(app);
const io = new Server(httpServer);

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.set("view engine", "ejs");

app.get("/", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "username picture")
    .populate("friendRequests", "username picture")
    .exec();
  if (!user) {
    return res.redirect("/login");
  }
  const posts = await Post.find({
    author: { $in: [...user.friends.map((item) => item.id), req.user.id] },
  })
    .sort({ updatedAt: "desc" })
    .populate("author", "username picture")
    .populate({
      path: "comments",
      populate: { path: "commentedBy", select: "username picture" },
    })
    .exec();

  let suggestions = await User.find({ _id: { $ne: req.user.id } });
  suggestions = suggestions.filter(
    (suggestion) =>
      !user.friends.some((friend) => friend._id.equals(suggestion._id))
  );
  let notifications = await Notification.find({
    user: { $eq: req.user.id },
    isRead: false,
  }).sort({ createdAt: "desc" });
  res.render("index", {
    user: user,
    suggestions: suggestions,
    posts: posts,
    pageUrl: "/",
    notifications: notifications,
  });
});

app.get("/api/explore-images", async (req, res) => {
  try {
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    const response = await axios.get(
      `https://api.unsplash.com/photos/random?count=10&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching images");
  }
});

app.get("/search", verifyTokenReq, async (req, res) => {
  const query = req.query.query;
  const results = await User.find({
    username: new RegExp(query, "i"),
    _id: { $ne: req.user.id },
  })
    .populate("friends", "username")
    .populate("friendRequests", "username");
  const user = await User.findById(req.user.id);
  res.render("searchResults", { results, query, user });
});

// OTP Verification Route
app.get("/verify-otp", (req, res) => {
  res.render("singnupOTP");
});
app.get("/authenticate", (req, res) => {
  res.render("loginOTP"); // Make sure the file is in your views folder
});

app.use(userRouter);
app.use(postRouter);
app.use(chatRouter);
app.use(exploreRouter);
app.use(profilePicRouter);

const { notifyNSP, chatNSP } = initSockets(io);
app.locals.notifyNSP = notifyNSP;
app.locals.chatNSP = chatNSP;

// app.listen(3001, () => {
//   console.log("server listening at port 3001");
// });

httpServer.listen(3001, () => {
  console.log("server listening at port 3001");
});
