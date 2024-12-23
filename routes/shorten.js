const express = require("express");
const shortid = require("shortid");
const validator = require("validator");
const URL = require("../models/Url.js");
const {
  ensureAuthenticated,
  createShortURLLimiter,
} = require("../middleware/ensureAuthenticated.js");
const Analytics = require("../models/Analytics.js");

const router = express.Router();

router.post(
  "/shorten",
  ensureAuthenticated,
  createShortURLLimiter,
  async (req, res) => {
    console.log(req.body);
    const { longUrl, customAlias, topic } = req.body;

    // Check if longUrl is provided
    if (!longUrl) {
      return res.render("shorten-failed", {
        message: "Please provide a valid URL.",
      });
    }

    // Validate the long URL
    if (!validator.isURL(longUrl)) {
      return res.render("shorten-failed", {
        message: "Invalid URL. Please enter a valid URL.",
      });
    }

    try {
      // Check if custom alias is provided and unique
      if (customAlias) {
        const existingAlias = await URL.findOne({ customAlias });
        if (existingAlias) {
          return res.render("shorten-failed", {
            message: "Custom alias already in use",
          });
        }
      }

      // Generate a unique short URL if no custom alias is provided
      const shortUrl = customAlias || shortid.generate();

      console.log(shortUrl);

      // Save to the database
      const newURL = await URL.create({
        longUrl,
        shortUrl,
        customAlias: customAlias || shortUrl,
        topic,
        userId: req.user._id,
      });

      return res.render("shorten-success", {
        message: "URL shortened successfully!",
        link: `${req.protocol}://${req.get("host")}/${shortUrl}`,
      });
      // res.status(201).json({
      //   shortUrl: `${req.protocol}://${req.get("host")}/${shortUrl}`,
      //   createdAt: newURL.createdAt,
      // });
    } catch (error) {
      console.error(error);
      return res.render("shorten-failed", {
        message: "Failed to shorten URL. Please try again.",
      });
    }
  }
);

// Inside your redirection route
router.get("/:alias", async (req, res) => {
  const { alias } = req.params;

  try {
    // Find the URL based on the alias
    const url = await URL.findOne({
      $or: [{ shortUrl: alias }, { customAlias: alias }],
    });

    if (!url) {
      // return res.status(404).json({ error: "Short URL not found" });
      return res.render("user-not-found");
    }

    // Collect analytics data (e.g., user agent, IP address, etc.)
    const analyticsData = {
      alias: alias,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip, // You can get the IP address from the request
      osType: getOS(req.get("User-Agent")), // You can extract the OS from the User-Agent string
      deviceType: getDeviceType(req.get("User-Agent")), // Extract the device type
      location: await getLocation(req.ip), // Get location based on IP (optional, requires external service)
    };

    // Save the analytics data
    await Analytics.create(analyticsData);

    // Increment the click count in the URL document
    url.clicks += 1;
    await url.save();

    // Redirect to the long URL
    res.redirect(url.longUrl);
  } catch (error) {
    res.redirect('user-not-found');
    res.status(500).json({ error: "Server error" });
  }
});

// Helper functions to get OS, device type, and location
function getOS(userAgent) {
  // You can use a library like `os` or write your own logic to extract OS info
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "MacOS";
  if (userAgent.includes("Linux")) return "Linux";
  return "Unknown OS";
}

function getDeviceType(userAgent) {
  // Logic to determine device type (e.g., mobile, tablet, desktop)
  if (userAgent.includes("Mobi")) return "Mobile";
  if (userAgent.includes("Tablet")) return "Tablet";
  return "Desktop";
}

async function getLocation(ip) {
  // You can use a geolocation service to fetch location info based on IP
  // Example: Use a service like ip-api or ipstack to get location data
  const location = await fetch(`https://ip-api.com/json/${ip}`).then((res) =>
    res.json()
  );
  return location.city || "Unknown location";
}

// Route for Analytics page
router.get("/user/analytics", ensureAuthenticated, async (req, res) => {
  try {
    // Fetch URLs created by the logged-in user
    const userUrls = await URL.find({ userId: req.user._id });

    // Pass the data to the analytics page
    res.render("analytics", { userUrls });
  } catch (error) {
    console.error(error);
    res.render("error", {
      message: "Error fetching analytics. Please try again.",
    });
  }
});


// Inside your analytics route handler
router.get('/user/shorten/:shortUrl', ensureAuthenticated, async (req, res) => {
  const { shortUrl } = req.params;

  try {
    // Find the URL entry based on the short URL
    const url = await URL.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Fetch the analytics for the short URL
    const analytics = await Analytics.find({ alias: shortUrl });

    res.render('url-analytics', { url, analytics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
