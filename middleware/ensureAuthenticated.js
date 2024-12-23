const rateLimit = require("express-rate-limit");
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};

const createShortURLLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 requests per window
  message: "Too many requests, please try again later.",
});

module.exports = { createShortURLLimiter, ensureAuthenticated };
