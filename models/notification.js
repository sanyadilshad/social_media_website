const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../misc/constants");

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = notificationSchema;
