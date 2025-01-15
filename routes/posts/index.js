const express = require("express");
const { verifyTokenReq } = require("../../misc");
const multer = require("multer");
const { Post, Comment, Notification, User } = require("../../models");
const { ERRORS, NOTIFICATION_TYPES } = require("../../misc/constants");
const router = express.Router();
// const upload = multer({ dest: "public/images/posts/tmp" });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/posts/");
  },
  filename: function (req, file, cb) {
    // console.log("File", file);
    let uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    let filename = file.originalname.split(".");
    let ext = filename.pop();
    cb(null, filename.join(".") + "-" + uniqueSuffix + "." + ext);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/posts",
  verifyTokenReq,
  upload.fields([
    { name: "post-img", maxCount: 1 },
    { name: "post-video", maxCount: 1 },
  ]),
  async (req, res) => {
    // console.log("files", req.files);
    const imageFiles = req.files["post-img"] || [];
    const videoFiles = req.files["post-video"] || [];
    let imagePath =
      imageFiles.length > 0 ? "/images/posts/" + imageFiles[0].filename : "";
    let videoPath =
      videoFiles.length > 0 ? "/images/posts/" + videoFiles[0].filename : "";

    const pageUrl = req.body.runFrom || "/";
    const postContent = req.body.post || "";
    const bgColor = req.body.bgColor || "#ffffff";

    if (postContent.length === 0) {
      return res.redirect(pageUrl);
    }

    await Post.create({
      author: req.user.id,
      content: postContent,
      imagePath,
      videoPath,
      bgColor
    });
    res.redirect(pageUrl);
  }
);

router.post("/posts/:postId/like", verifyTokenReq, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    let likeStatus = "";
    if (post.likes.includes(userId)) {
      // Unlike if already liked
      post.likes.pull(userId);
      likeStatus = "unliked";
    } else {
      // Like if not already liked
      post.likes.push(userId);
      likeStatus = "liked";
    }

    await post.save();

    Notification.create({
      type: `post:${likeStatus}`,
      user: post.author.valueOf(),
      data: {
        postId: post._id.valueOf(),
        likesCount: post.likes.length,
        actionBy: req.user,
      },
      message: `<strong>${req.user.username}</strong> ${likeStatus} your post`,
    })
      .then(async (notification) => {
        const notifyNSP = req.app.locals.notifyNSP || null;
        if (notifyNSP) {
          res.render(
            "partials/notification-item",
            { notification },
            (templateErr, html) => {
              if (!templateErr) {
                notifyNSP
                  .to(notification.user.valueOf())
                  .emit("notifications", notification, html);
              } else {
                console.log(
                  "Error while parsing notification-item template",
                  templateErr
                );
              }
            }
          );

          // find post owner friends - who can see this post notify them to update their post like/unlike
          const postOwner = await User.findById(post.author);
          const ownerFriends = postOwner.friends.map((item) => item.valueOf());
          console.log("Owner Friends", ownerFriends);
          notifyNSP
            .to([
              ...ownerFriends.filter((item) => item !== req.user.id),
              post.author.valueOf(),
            ])
            .emit("actionUpdates", notification);
        }
      })
      .catch(console.log);

    // res.redirect("back"); // Redirect back to the previous page
    res.json({
      success: true,
      message: `You ${likeStatus} the post`,
      likeStatus,
      post,
    });
  } catch (err) {
    console.error(err);
    // res.redirect("back"); // Handle errors and redirect
    res.json({ success: false, message: ERRORS.GENERIC_ERROR });
  }
});

//post a comment
router.post("/posts/:postId/comments", verifyTokenReq, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const comments = req.body.comments;

    // Create a new comment
    let comment = await Comment.create({
      comments,
      postId,
      commentedBy: userId,
      likes: [],
    });

    comment = await Comment.findById(comment._id).populate(
      "commentedBy",
      "username picture"
    );
    // Add the comment to the post's comments array
    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $push: { comments: comment._id },
    });

    // notify owner for the comments
    Notification.create({
      type: `comment:added`,
      user: updatedPost.author.valueOf(),
      data: {
        comment,
      },
      message: `<strong>${req.user.username}</strong> added comments to your post`,
    })
      .then(async (notification) => {
        const notifyNSP = req.app.locals.notifyNSP || null;
        if (notifyNSP) {
          res.render(
            "partials/notification-item",
            { notification },
            (templateErr, html) => {
              if (!templateErr) {
                notifyNSP
                  .to(notification.user.valueOf())
                  .emit("notifications", notification, html);
              } else {
                console.log(
                  "Error while parsing notification-item template",
                  templateErr
                );
              }
            }
          );

          // find post owner friends - who can see this post notify them to update their post like/unlike
          const postOwner = await User.findById(updatedPost.author);
          const ownerFriends = postOwner.friends.map((item) => item.valueOf());

          res.render(
            "partials/post-comment-item",
            { comment, user: req.user },
            (templateErr, html) => {
              if (!templateErr) {
                notifyNSP
                  .to([
                    ...ownerFriends.filter((item) => item !== req.user.id),
                    updatedPost.author.valueOf(),
                    req.user.id,
                  ])
                  .emit("actionUpdates", {
                    type: notification.type,
                    comment: comment,
                    commentsCount: updatedPost.comments.length + 1,
                    commentHtml: html,
                  });
              } else {
                console.log(
                  "Error while parsing post-comment-item template",
                  templateErr
                );
              }
            }
          );
        }
      })
      .catch(console.log);

    // res.redirect("back"); // Redirect to the post page or another appropriate page
    res.json({
      success: true,
      message: `Your comments saved successfully`,
      comment,
    });
  } catch (err) {
    console.error(err);
    // res.status(500).send("Server error");
    res.json({ success: false, message: ERRORS.GENERIC_ERROR });
  }
});

router.post("/comments/:commentId/like", verifyTokenReq, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    let likeStatus = "";
    if (!comment.likes) comment.likes = [];
    if (comment.likes.includes(userId)) {
      comment.likes.pull(userId);
      likeStatus = "unliked";
    } else {
      comment.likes.push(userId);
      likeStatus = "liked";
    }

    await comment.save();

    Notification.create({
      type: `comment:${likeStatus}`,
      user: comment.commentedBy.valueOf(),
      data: {
        commentId: comment._id.valueOf(),
        likesCount: comment.likes.length,
        actionBy: req.user,
        postId: comment.postId.valueOf(),
      },
      message: `<strong>${req.user.username}</strong> ${likeStatus} your comment`,
    })
      .then(async (notification) => {
        const notifyNSP = req.app.locals.notifyNSP || null;
        if (notifyNSP) {
          res.render(
            "partials/notification-item",
            { notification },
            (templateErr, html) => {
              if (!templateErr) {
                notifyNSP
                  .to(notification.user.valueOf())
                  .emit("notifications", notification, html);
              } else {
                console.log(
                  "Error while parsing notification-item template",
                  templateErr
                );
              }
            }
          );

          // find post owner friends - who can see this post notify them to update their post like/unlike
          const post = await Post.findById(comment.postId);
          const postOwner = await User.findById(post.author);
          const ownerFriends = postOwner.friends.map((item) => item.valueOf());
          console.log("Owner Friends", ownerFriends);
          notifyNSP
            .to([
              ...ownerFriends.filter((item) => item !== req.user.id),
              post.author.valueOf(),
            ])
            .emit("actionUpdates", notification);
        }
      })
      .catch(console.log);

    // res.redirect("back");
    res.json({
      success: true,
      message: `You ${likeStatus} the post comment`,
      likeStatus,
      comment,
    });
  } catch (err) {
    console.error(err);
    // res.redirect("back");
    res.json({ success: false, message: ERRORS.GENERIC_ERROR });
  }
});

module.exports = router;
