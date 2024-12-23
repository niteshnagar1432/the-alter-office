const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  longUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true },
  customAlias: { type: String, required: false, default: null },
  topic: {
    type: String,
    enum: ["acquisition", "activation", "retention"],
    default: null,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clicks: {
    type: Number,
    default: 0,
  },
  createdAt: { type: Date, default: Date.now },
});

const Url = mongoose.model("Url", urlSchema);
module.exports = Url;
