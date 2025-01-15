const { JWT_SECRET, VERIFIED2FA_STATUS } = require("./constants");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const { Notification } = require("../models");

// var transporter = nodemailer.createTransport({
//   host: "live.smtp.mailtrap.io",
//   port: 587,
//   auth: {
//     user: "api",
//     pass: "b9e5fb898677e3f6987afbafb3fac1c0",
//   },
// });

var transporter = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api",
    pass: "b8fb61fd0d24f6a0fa3fa9476fa12e17"
  }
});

function verifyToken(token, cb) {
  if (!token) {
    return cb(false);
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return cb(false);
    }
    cb(true, decoded);
  });
}
function verifyTokenReq(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect("/login");
  }
  verifyToken(token, async function (isVerified, data) {
    if (!isVerified) {
      return res.redirect("/login");
    }
    const verified2FA = data.verified2FA || VERIFIED2FA_STATUS.PENDING;
    if (verified2FA == VERIFIED2FA_STATUS.PENDING) {
      return res.redirect("/login");
    } else if (
      verified2FA == VERIFIED2FA_STATUS.INPROGRESS &&
      req.path !== "/verify-token"
    ) {
      if (!req.cookies.tokenHash) {
        return res.redirect("/login");
      }
      return res.redirect("/verify-token");
    }
    console.log("Logged in user", data);
    req.user = data;
    req.app.locals.token = token;
    req.app.locals.alertCount = await Notification.find({
      user: { $eq: req.user.id },
      isRead: false,
    }).countDocuments();
    next();
  });
}

function generateOtp(maxLen = 6) {
  let otp = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < maxLen; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return otp;
}

async function sendLoginOtp(user, otp) {
  try {
    const info = await transporter.sendMail({
      from: '"Friendzy" <no-reply@demomailtrap.com>', // sender address
      to: user.email, // list of receivers
      subject: "Your Login OTP - Friendzy", // Subject line
      text: "Use this login token to verify and complete the login: " + otp, // plain text body
      html:
        "<p>Use this login token to verify and complete the login: <b>" +
        otp +
        "</b></p>", // html body
    });
    console.log("Message sent: %s", info.messageId);
  } catch (ex) {
    console.log(ex);
  }
}

async function sendRegisterOtp(user, otp) {
  try {
    const info = await transporter.sendMail({
      from: '"Friendzy" <no-reply@demomailtrap.com>', // sender address
      to: [user.email,'sanya792.be22@chitkara.edu.in'].join(", "),
      subject: "Your signup OTP - Friendzy", // Subject line
      text:
        "Use this signup token to verify and complete the signup process: " +
        otp, // plain text body
      html:
        "<p>Use this signup token to verify and complete the signup process: <b>" +
        otp +
        "</b></p>", // html body
    });
    console.log("Message sent: %s", info.messageId);
  } catch (ex) {
    console.log(ex);
  }
}

module.exports = {
  verifyToken,
  verifyTokenReq,
  generateOtp,
  sendLoginOtp,
  sendRegisterOtp,
};
