const express = require("express");
const { verifyTokenReq } = require("../../misc");
const multer = require("multer");
const path = require("path");
const { User } = require("../../models");
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/users"); // Save files to public/profilePic
  },
  filename: function (req, file, cb) {
    let uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    let filename = file.originalname.split(".");
    let ext = filename.pop();
    cb(null, filename.join(".") + "-" + uniqueSuffix + "." + ext);
  },
});

const upload = multer({ storage: storage });

// Route to render the upload profile picture page
router.get("/uploadProfilePic", verifyTokenReq, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("uploadProfilePic", { user });
});

// Route to handle the profile picture upload
router.post(
  "/uploadProfilePicture",
  verifyTokenReq,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      // Update the user's profile picture path in the database
      const user = await User.findById(req.user.id);
      if (req.file) {
        user.picture = `/images/users/${req.file.filename}`; // Update path to reflect new directory
        await user.save();
      }

      // Redirect to the profile page after successful upload
      res.redirect("/me");
    } catch (err) {
      console.error(err);
      res.render("uploadProfilePic", {
        error:
          "An error occurred while uploading your profile picture. Please try again.",
      });
    }
  }
);

module.exports = router;
