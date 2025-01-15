const express = require("express");
const router = express.Router();
const { User } = require("../../models");
const { verifyTokenReq } = require("../../misc");
const axios = require("axios");

router.get("/exploremore", verifyTokenReq, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const perPage = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page

    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

    if (!UNSPLASH_ACCESS_KEY) {
      return res.status(500).send("Unsplash access key is missing.");
    }

    const response = await axios.get("https://api.unsplash.com/photos", {
      params: {
        page: page,
        per_page: perPage,
        client_id: UNSPLASH_ACCESS_KEY,
      },
    });

    if (response.status !== 200) {
      return res
        .status(response.status)
        .send("Error fetching images from Unsplash.");
    }

    res.render("exploremore", { user, images: response.data, page, perPage });
  } catch (error) {
    console.error("Error fetching images:", error.message);
    res.status(500).send("Error fetching images");
  }
});

module.exports = router;
