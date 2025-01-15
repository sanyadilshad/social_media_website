const express = require("express");
const router = express.Router();
const {
  ERRORS,
  JWT_SECRET,
  VERIFIED2FA_STATUS,
} = require("../../misc/constants");
const { User, Post, Notification } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  verifyTokenReq,
  generateOtp,
  sendLoginOtp,
  sendRegisterOtp,
} = require("../../misc");

router.get("/signup", (req, res) => {
  res.render("signup", { error: "", formValues: {} });
});

router.post("/signup", async function (req, res) {
  let {
    username,
    email,
    phoneNumber,
    password,
    confirmPassword,
    gender,
    date,
  } = req.body;
  let foundUser = await User.findOne({ username });
  if (foundUser) {
    return res.render("signup", {
      error: ERRORS.USER_ALREADY_EXISTS,
      formValues: req.body,
    });
  }
  if (password.length < 6) {
    return res.render("signup", {
      error: ERRORS.INVALID_PASSWORD_LENGTH,
      formValues: req.body,
    });
  }
  if (phoneNumber.length < 10) {
    return res.render("signup", {
      error: ERRORS.INVALID_PHONE,
      formValues: req.body,
    });
  }

  if (password !== confirmPassword) {
    return res.render("signup", {
      error: ERRORS.NOT_MATCHED_PWD_CONFIRM_PWD,
      formValues: req.body,
    });
  }

  const saltRounds = 10;
  return bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      return res.render("signup", { error: ERRORS.GENERIC_ERROR });
    }
    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) {
        return res.render("signup", { error: ERRORS.GENERIC_ERROR });
      }
      const newUser = await User.create({
        username,
        email,
        phone: phoneNumber,
        password: hash,
        gender,
        dob: date,
      });
      console.log(newUser);
      let signupHash = jwt.sign(
        { id: newUser._id, username: newUser.username, email: newUser.email },
        JWT_SECRET
      );
      res.cookie("signupHash", signupHash, { httpOnly: true });
      return res.redirect("/verify-signup/" + signupHash);
      // return res.render("successCreateUser", { user: newUser });
    });
  });
});

router.get("/profile", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id);
  const sidebarLinks = [
    { label: "Home", route: "/", imgURL: "public/images/Friendzy.png" },
    { label: "Profile", route: "/profile", imgURL: "/public/images/user.png" },
    // Add more links as needed
  ];
  res.render("profile", { user, sidebarLinks, pathname: "/profile" });
});

router.get("/login", (req, res) => {
  res.render("login", { error: "" });
});

router.post("/login", async (req, res) => {
  let user = await User.findOne({
    username: req.body.username,
    isVerified: true,
  });
  if (!user) {
    return res.render("login", {
      error: ERRORS.INVALID_LOGIN,
    });
  }
  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (err) {
      return res.render("login", {
        error: ERRORS.GENERIC_ERROR,
      });
    }
    if (result) {
      let token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          verified2FA: VERIFIED2FA_STATUS.INPROGRESS,
        },
        JWT_SECRET
      );
      res.cookie("token", token, { httpOnly: true });
      const tokenHash = generateOtp();
      res.cookie("tokenHash", tokenHash, { httpOnly: true });
      console.log("Token Hash", tokenHash);
      sendLoginOtp(user, tokenHash).catch(console.log);
      res.redirect("/verify-token");
    } else {
      return res.render("login", {
        error: ERRORS.INVALID_LOGIN,
      });
    }
  });
});
router.post(
  "/friend-request/:suggestionId",
  verifyTokenReq,
  async (req, res) => {
    const suggestionId = req.params.suggestionId;
    const suggestion = await User.findById(suggestionId);
    if (suggestion) {
      if (suggestion.friendRequests.includes(req.user.id)) {
        res.json({
          success: false,
          message: "Your friend request already registered",
        });
      } else if (suggestion.friends.includes(req.user.id)) {
        res.json({
          success: false,
          message: `You already a friend of ${suggestion.username}`,
        });
      } else {
        suggestion.friendRequests.push(req.user.id);
        await suggestion.save();

        Notification.create({
          type: `frequest:sent`,
          user: suggestion.id.valueOf(),
          data: {
            suggestion,
          },
          message: `<strong>${req.user.username}</strong> sent a friend request`,
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
            }
          })
          .catch(console.log);
        res.json({
          success: true,
          message: "Your friend request sent successfully",
        });
      }
    } else {
      res.json({
        success: false,
        message: "Suggested account not found",
      });
    }
  }
);

router.post("/accept-friend/:requestId", verifyTokenReq, async (req, res) => {
  const requestId = req.params.requestId;
  const user = await User.findById(req.user.id);
  if (user) {
    if (
      user.friendRequests.includes(requestId) &&
      !user.friends.includes(requestId)
    ) {
      const requester = await User.findById(requestId);
      if (requester) {
        user.friends.push(requestId);
        user.friendRequests.pull(requestId);
        await user.save();
        requester.friends.push(req.user.id);
        await requester.save();
        Notification.create({
          type: `frequest:approved`,
          user: requester.id.valueOf(),
          data: {
            requester,
          },
          message: `<strong>${req.user.username}</strong> accepted your friend request`,
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
            }
          })
          .catch(console.log);
        res.json({
          success: true,
          message: "You are now friend of " + requester.username,
        });
      } else {
        res.json({
          success: false,
          message: "Friend account not found!",
        });
      }
    } else {
      res.json({
        success: false,
        message: "No friend request found!",
      });
    }
  } else {
    res.json({
      success: false,
      message: "No friend request found!",
    });
  }
});

router.post("/decline-friend/:requestId", verifyTokenReq, async (req, res) => {
  const requestId = req.params.requestId;
  const user = await User.findById(req.user.id);
  if (user) {
    if (user.friendRequests.includes(requestId)) {
      user.friendRequests.pull(requestId);
      await user.save();
      Notification.create({
        type: `frequest:rejected`,
        user: requestId,
        data: {},
        message: `<strong>${req.user.username}</strong> rejected your friend request`,
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
          }
        })
        .catch(console.log);
      res.json({
        success: true,
        message: "Request declined successfully",
      });
    } else {
      res.json({
        success: false,
        message: "No friend request found!",
      });
    }
  } else {
    res.json({
      success: false,
      message: "No friend request found!",
    });
  }
});

router.post("/remove-friend/:friendId", verifyTokenReq, async (req, res) => {
  const friendId = req.params.friendId;
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { friends: friendId },
  });

  await User.findByIdAndUpdate(friendId, {
    $pull: { friends: req.user.id },
  });

  res.json({
    success: true,
    message: "Your friend removed from your friends list",
  });
});

router.get("/me", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "username picture")
    .populate("friendRequests", "username picture")
    .exec();

  const posts = await Post.find({ author: req.user.id })
    .sort({ updatedAt: "desc" })
    .populate("author", "username picture")
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
  res.render("me", { user, posts, suggestions, pageUrl: "/me" });
});

router.get("/profile/:username", verifyTokenReq, async (req, res) => {
  const profileUser = await User.findOne({ username: req.params.username })
    .populate("friends", "username picture")
    .exec();

  const user = await User.findById(req.user.id);

  const posts = await Post.find({ author: profileUser.id })
    .sort({ updatedAt: "desc" })
    .populate("author", "username picture")
    .populate("author", "username picture")
    .populate({
      path: "comments",
      populate: { path: "commentedBy", select: "username picture" },
    })
    .exec();

  res.render("profile", {
    profileUser,
    user,
    posts,
  });
});

router.get("/edit-bio", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("editBio", { user: user });
});
router.post("/update-bio", verifyTokenReq, async (req, res) => {
  const { bio } = req.body;
  const userId = req.user.id;

  await User.findByIdAndUpdate(userId, { bio });

  res.redirect("/me");
});

router.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.clearCookie("tokenHash");
  res.redirect("/login");
});

router.post("/notifications/mark-read", verifyTokenReq, async (req, res) => {
  const { type, notificationId } = req.body;

  if (type === "all") {
    await Notification.updateMany(
      {
        user: { $eq: req.user.id },
        isRead: false,
      },
      { isRead: true }
    );
    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } else if (type === "single" && notificationId) {
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } else {
    res.json({
      success: false,
      message: "Invalid request!",
    });
  }
});

router.get("/verify-token", verifyTokenReq, async (req, res) => {
  if (req.user.verified2FA === VERIFIED2FA_STATUS.COMPLETED) {
    return res.redirect("/");
  }
  let user = await User.findOne({ username: req.user.username });
  if (!user) {
    return res.render("login", {
      error: ERRORS.INVALID_LOGIN,
    });
  }
  let [emailPrefix, emailPostfix] = user.email.split("@");

  res.render("verify-token", {
    user: user,
    encodedEmail: `${emailPrefix
      .substring(0, 3)
      .padEnd(6, "*")}${emailPostfix}`,
  });
});

router.post("/verify-token", verifyTokenReq, (req, res) => {
  const { otp } = req.body;
  const tokenHash = req.cookies.tokenHash || "";
  if (otp === tokenHash) {
    // refresh the token and remove tokenHash
    let token = jwt.sign(
      {
        id: req.user.id,
        username: req.user.username,
        verified2FA: VERIFIED2FA_STATUS.COMPLETED,
      },
      JWT_SECRET
    );
    res.cookie("token", token, { httpOnly: true });
    res.clearCookie("tokenHash");
    res.redirect("/");
  }
});

router.get("/verify-signup/:token", (req, res) => {
  const requestHash = req.params.token;
  const signupHash = req.cookies.signupHash || "";
  if (signupHash === requestHash) {
    jwt.verify(signupHash, JWT_SECRET, (err, decoded) => {
      console.log("Token Verification err", err, decoded);

      if (!err) {
        const otp = generateOtp();
        res.cookie("signupToken", otp, { httpOnly: true });
        sendRegisterOtp(decoded, otp);
        console.log("Register token sent", otp);
      }

      res.render("verify-signup", {
        user: decoded || null,
        token: signupHash,
        err: err ? new Error("Invalid/Expired token") : null,
      });
    });
  } else {
    res.render("verify-signup", {
      user: null,
      token: "",
      err: new Error("Invalid/Expired token"),
    });
  }
});

router.post("/verify-signup", (req, res) => {
  const { token: requestHash, otp } = req.body;
  const signupHash = req.cookies.signupHash || "";
  const signupToken = req.cookies.signupToken || "";
  if (signupHash === requestHash) {
    if (signupToken === otp) {
      jwt.verify(signupHash, JWT_SECRET, async (err, decoded) => {
        if (err) {
          return res.render("verify-signup", {
            user: null,
            token: requestHash,
            err: new Error("Invalid/Expired token"),
          });
        }
        await User.findByIdAndUpdate(decoded.id, { isVerified: true });
        res.clearCookie("signupToken");
        res.clearCookie("signupHash");
        res.render("successCreateUser", { user: decoded });
      });
    } else {
      res.render("verify-signup", {
        user: null,
        token: requestHash,
        err: new Error("Invalid Otp"),
      });
    }
  } else {
    res.render("verify-signup", {
      user: null,
      token: requestHash,
      err: new Error("Invalid/Expired token"),
    });
  }
});
router.get("/resend/login", verifyTokenReq, async (req, res) => {
  if (req.user.verified2FA === VERIFIED2FA_STATUS.COMPLETED) {
    return res.redirect("/");
  }
  let user = await User.findOne({ username: req.body.username });
  if (!user) {
    return res.render("login", {
      error: ERRORS.INVALID_LOGIN,
    });
  }
  const tokenHash = generateOtp();
  res.cookie("tokenHash", tokenHash, { httpOnly: true });
  console.log("Token Hash", tokenHash);
  sendLoginOtp(user, tokenHash).catch(console.log);
  res.redirect("/verify-token");
});

router.get("/resend/signup/:token", async (req, res) => {
  const requestHash = req.params.token;
  const signupHash = req.cookies.signupHash || "";
  if (signupHash === requestHash) {
    jwt.verify(signupHash, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.render("verify-signup", {
          user: null,
          token: requestHash,
          err: new Error("Invalid/Expired token"),
        });
      }
      let user = await User.findOne({ username: decoded.username });
      if (!user) {
        return res.render("verify-signup", {
          user: null,
          token: requestHash,
          err: new Error("Invalid/Expired token"),
        });
      }
      const tokenHash = generateOtp();
      res.cookie("signupToken", tokenHash, { httpOnly: true });
      console.log("Sign up token", tokenHash);
      sendRegisterOtp(user, tokenHash).catch(console.log);
      res.redirect("/verify-signup/" + signupHash);
    });
  } else {
    res.render("verify-signup", {
      user: null,
      token: requestHash,
      err: new Error("Invalid/Expired token"),
    });
  }
});

module.exports = router;
