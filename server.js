// server.js
const express = require("express");
const path = require("path");
const session = require("express-session");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config();

const app = express();

// Body parser, static files & sessions
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        console.warn(
          "⚠️  SESSION_SECRET not set in environment. Using fallback secret. This is NOT safe for production!"
        );
        return "dev-fallback-secret-please-change";
      })(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

// MongoDB
const client = new MongoClient(process.env.URI);
let db;

// Connect to MongoDB and start server only after connection is ready
client
  .connect()
  .then(() => {
    db = client.db(process.env.DB_NAME);
    app.locals.db = db; // Attach db to app.locals
    console.log("✅ Database connected");

    // Start server only after DB is ready
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

// Middleware to ensure db is available in all requests
app.use((req, res, next) => {
  if (!req.app.locals.db) {
    return res
      .status(503)
      .send("Database not connected. Please try again later.");
  }
  next();
});

// Middleware: protect routes
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// Helper: compare plaintext to hashed data
async function compareData(plainText, hashed) {
  try {
    return await bcrypt.compare(plainText, hashed);
  } catch (err) {
    console.error("Error comparing data:", err);
    throw err;
  }
}

// ─── AUTH: Register & Login ────────────────────────────────────────────

// Show registration form
app.get("/register", (req, res) => {
  res.render("register", {
    errors: [],
    formData: { email: "", name: "" },
  });
});

// Handle registration
app.post("/register", async (req, res) => {
  const { email, name, password } = req.body;
  const errors = [];

  if (!email || !name || !password) {
    errors.push({ msg: "Please fill in all fields" });
  }
  if (errors.length) {
    return res.render("register", { errors });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await req.app.locals.db
    .collection(process.env.USER_COLLECTION)
    .insertOne({
      email,
      name,
      password: hash,
    });

  // Log the user in
  req.session.userId = result.insertedId;
  res.redirect("/setup-profile"); // Redirect to setup flow
});

// Show login form
app.get("/login", (req, res) => {
  res.render("login", { errors: [], formData: {} });
});

// Handle login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("login", {
      errors: [{ msg: "Please provide your email and password" }],
      formData: { email },
    });
  }

  try {
    const user = await req.app.locals.db
      .collection(process.env.USER_COLLECTION)
      .findOne({ email });
    if (!user) {
      return res.render("login", {
        errors: [{ msg: "Invalid email or password" }],
        formData: { email },
      });
    }

    const isMatch = await compareData(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        errors: [{ msg: "Invalid email or password" }],
        formData: { email },
      });
    }

    // Log the user in
    req.session.userId = user._id;
    res.redirect("/home");
  } catch (error) {
    console.error("Error processing login:", error);
    res.status(500).render("login", {
      errors: [{ msg: "Server error, please try again later." }],
      formData: { email },
    });
  }
});

app.get("/loginHome", (req, res) => {
  res.render("loginHome.ejs");
});
// ─── HOMEPAGE ────────────────────────────────────────────────────────────

// Redirect root to /home
app.get("/", async (req, res) => {
  try {
    // Fetch all meets from MongoDB
    const meets = await req.app.locals.db
      .collection("meets")
      .find({})
      .toArray();
    res.render("home", {
      meets,
      userId: req.session.userId || null,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).send("Error fetching meetings");
  }
});

// Protected homepage
app.get("/home", requireLogin, async (req, res) => {
  try {
    // Fetch all meets from MongoDB
    const meets = await req.app.locals.db
      .collection("meets")
      .find({})
      .toArray();
    res.render("home", {
      meets,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).send("Error fetching meetings");
  }
});

// ─── PROFILE & UPLOADS ───────────────────────────────────────────────────

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files are allowed")),
});

// View profile (add ?edit=true to edit)
app.get("/profile/:id", requireLogin, async (req, res) => {
  try {
    const profile = await req.app.locals.db
      .collection(process.env.USER_COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    res.render("profile", {
      profile,
      editing: req.query.edit === "true",
      userId: req.session.userId,
      activePage: "profile",
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Error loading profile");
  }
});

// Handle profile update & photo upload
app.post(
  "/profile/:id",
  requireLogin,
  upload.single("photo"),
  async (req, res) => {
    try {
      const id = req.params.id;
      const tags = (req.body.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const languages = (req.body.languages || "")
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      // Fetch current profile to check for photo
      const currentProfile = await req.app.locals.db
        .collection(process.env.USER_COLLECTION)
        .findOne({ _id: new ObjectId(id) });

      // If no photo uploaded and no existing photo, reject
      if (!req.file && (!currentProfile || !currentProfile.photoUrl)) {
        return res.status(400).render("profile", {
          profile: currentProfile,
          editing: true,
          userId: req.session.userId,
          activePage: "profile",
          error: "Profile photo is required.",
        });
      }

      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        location: req.body.location, // Save location from dropdown
        tags,
        languages,
        bio: req.body.bio,
        vibe: req.body.vibe,
        preferredGender: req.body.preferredGender,
        ageRange: {
          min: parseInt(req.body.ageMin, 10),
          max: parseInt(req.body.ageMax, 10),
        },
      };
      if (req.file) {
        updateData.photoUrl = "/uploads/" + req.file.filename;
      }

      await req.app.locals.db
        .collection(process.env.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      res.redirect("/profile/" + id);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).send("Error updating profile");
    }
  }
);

// (Optional) Test endpoint to create a profile
app.get("/create-test-profile", async (req, res) => {
  const testUser = {
    name: "Test User",
    location: "Amsterdam",
    tags: ["Test", "Demo"],
    languages: ["Dutch", "English"],
    bio: "This is a test profile",
  };
  const result = await req.app.locals.db
    .collection(process.env.USER_COLLECTION)
    .insertOne(testUser);
  res.send(`Test profile created with ID: ${result.insertedId}`);
});

// ─── MORE MEETS ─────────────────────────────────────────────────────────
app.get("/more-meets", requireLogin, (req, res) => {
  res.render("more-meets", {
    userId: req.session.userId || null,
    user: req.session.user || null,
  });
});

// ─── MANAGE MEETS ─────────────────────────────────────────────────────
app.get("/meets", requireLogin, async (req, res) => {
  try {
    const meets = await req.app.locals.db
      .collection("meets")
      .find({})
      .toArray();
    res.render("meets", {
      meets,
      userId: req.session.userId || null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error fetching meets for manage page:", error);
    res.status(500).send("Error fetching meets");
  }
});

// User routes
const userRoutes = require("./routes/user");
app.use("/users", userRoutes);

// ─── SETUP PROFILE FLOW ───────────────────────────────────────────────

// Show setup profile form
app.get("/setup-profile", requireLogin, async (req, res) => {
  res.render("setup-profile", { userId: req.session.userId, error: null });
});

// Handle setup profile form submission
app.post(
  "/setup-profile",
  requireLogin,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).render("setup-profile", {
          userId: req.session.userId,
          error: "Profile picture is required.",
        });
      }
      const id = req.session.userId;
      const tags = (req.body.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        bio: req.body.bio,
        tags,
        vibe: req.body.vibe,
        preferredGender: req.body.preferredGender,
        ageRange: {
          min: parseInt(req.body.ageMin, 10),
          max: parseInt(req.body.ageMax, 10),
        },
        photoUrl: "/uploads/" + req.file.filename,
        location: req.body.location, // Save location from dropdown
      };
      await req.app.locals.db
        .collection(process.env.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      res.redirect("/home");
    } catch (error) {
      console.error("Error updating setup profile:", error);
      res.status(500).send("Error saving profile setup");
    }
  }
);

// Handle logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Error logging out");
    }
    res.redirect("/login"); // Redirect to login page after logout
  });
});

// ─── MEET DETAIL PAGE ───────────────────────────────────────────────
app.get("/meet/:id", requireLogin, async (req, res) => {
  try {
    const meet = await req.app.locals.db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    // Optionally, check if user is a member
    const isMember = (meet.members || []).some(
      (m) => m.toString() === req.session.userId?.toString()
    );
    res.render("meet-overview", {
      meet,
      userId: req.session.userId,
      isMember,
    });
  } catch (error) {
    console.error("Error loading meet detail:", error);
    res.status(500).send("Error loading meet detail");
  }
});

// 404 handler (should be last)
app.use((_, res) => res.status(404).send("Not Found"));
