const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const redisClient = require("./redis");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const Url = require("./models/Url");
const authRoutes = require("./routes/auth");
const urlRoutes = require("./routes/shorten");
const session = require("express-session");
const User = require("./models/User");
const { ensureAuthenticated } = require("./middleware/ensureAuthenticated");
const path = require("path");

// Load environment variables
dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT || 3000;

// Define __dirname properly in CommonJS
// const __dirname = path.resolve();

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

connectDB();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/", urlRoutes);

app.use(express.static(path.join(__dirname, "public")));

// Sample route
app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.get("/user/shorten", (req, res) => {
  let user = req.user;
  res.render("shorten", { user });
});

app.get("/shorten-success", (req, res) => {
  let link = req.query.link;
  res.render("shorten-success", {
    message: "URL shortened successfully!",
    link,
  });
});

// Failure page route
app.get("/shorten-failed", (req, res) => {
  res.render("shorten-failed", {
    message: "There was an error shortening the URL. Please try again.",
  });
});

app.get("/analytics", (req, res) => {
  res.render("analytics", { title: "Analytics" });
});

app.get("/test-redis", async (req, res) => {
  try {
    await redisClient.set("foo", "Redis is working!");
    const value = await redisClient.get("foo");
    res.send(`Redis Test: ${value}`);
  } catch (error) {
    res.status(500).send("Redis Error: " + error.message);
  }
});

app.post("/test-db", async (req, res) => {
  try {
    const { alias, longUrl, shortUrl } = req.body;
    if (!alias || !longUrl || !shortUrl) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }
    const newUrl = await Url.create({ alias, longUrl, shortUrl });
    res.json(newUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/user/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    console.log(req.user);
    let user = await User.findOne({ email: req.user.email });

    if (user) {
      res.render("dashboard", { user });
      // res.json({ message: `Welcome, ${req.user.name}!` });
    } else {
      user = await User.create({
        email: req.user.email,
        name: req.user.name,
        googleId: req.user.googleId,
      });
      res.json({ message: `Welcome, ${req.user.name}!`, user });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/user/profile", ensureAuthenticated, async (req, res) => {
  try {
    let user = await User.findOne({ email: req.user.email });
    res.render("profile", { user });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
