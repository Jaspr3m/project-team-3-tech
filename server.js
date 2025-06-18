// server.js
const express = require("express");
const path = require("path");
const session = require("express-session");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
// const xss = require('xss');
require("dotenv").config();

const app = express();
const saltRounds = 10;

// Body parser, static files & sessions
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-fallback-secret",
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
client
  .connect()
  .then(() => {
    db = client.db(process.env.DB_NAME);
    console.log("✅ Database connected");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

async function hashData(data) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedData = await bcrypt.hash(data, salt);
    return hashedData;
  } catch (error) {
    console.error("Error hashing data:", error);
    throw error;
  }
}

// Middleware: protect routes
// function requireLogin(req, res, next) {
//   if (!req.session.userId) {
//     return res.redirect('/login');
//   }
//   next();
// }

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

app.post(
  "/register",
  [
    body("email").isEmail().withMessage("Fill in a valid E-mail adress"),
    body("name").notEmpty().withMessage("Fill in your name"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must contain at least 6 charachters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { email, name, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("register", {
        errors: errors.array(),
        formData: { email, name, password },
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.collection(process.env.USER_COLLECTION).insertOne({
      email,
      name,
      password: hash,
    });
    try {
      const hashedPassword = await hashData(password);
      const user = { email, name, password: hashedPassword };
      const insertResult = await db.collection("users").insertOne(user);
      console.log("Inserted user:", insertResult.insertedId);
      // Redirect to setup-profile after registration
      req.session.userId = insertResult.insertedId;
      return res.redirect("/setup-profile");
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).render("register", {
        errors: [{ msg: "Something went wrong with registering your account" }],
        formData: { email, name, password },
      });
    }
  }
);

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
      formData: { email, password },
    });
  }

  try {
    const user = await db
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

function showRegister(req, res) {
  res.render("register.ejs", { errors: [] });
}

function showLogin(req, res) {
  res.render("login.ejs", { errors: [] });
}

function showLoginHome(req, res) {
  res.render("loginHome.ejs", { errors: [] });
}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────

// Redirect root to /home
app.get("/", (req, res) => {
  return res.redirect("/home");
});

// Protected homepage
app.get("/home", async (req, res) => {
  try {
    // Fetch all meets from MongoDB
    const meets = await db.collection("meets").find({}).toArray();
    let user = null;
    if (req.session.userId) {
      user = await db
        .collection(process.env.USER_COLLECTION)
        .findOne({ _id: new ObjectId(req.session.userId) });
    }
    res.render("home", {
      meets,
      userId: req.session.userId,
      user,
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
app.get("/profile/:id", async (req, res) => {
  try {
    const profile = await db
      .collection(process.env.USER_COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!profile) {
      return res.status(404).send("Profile not found");
    }
    let user = null;
    if (req.session.userId) {
      user = await db
        .collection(process.env.USER_COLLECTION)
        .findOne({ _id: new ObjectId(req.session.userId) });
    }
    res.render("profile", {
      profile,
      editing: req.query.edit === "true",
      userId: req.session.userId,
      user,
      activePage: "profile",
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Error loading profile");
  }
});

// Handle profile update & photo upload
app.post("/profile/:id", upload.single("photo"), async (req, res) => {
  try {
    const id = req.params.id;
    const tags = (req.body.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    // Add support for vibe, preferredGender, and age range
    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      bio: req.body.bio,
      tags,
      vibe: req.body.vibe,
      preferredGender: req.body.preferredGender,
      location: req.body.location,
      ageMin: req.body.ageMin ? parseInt(req.body.ageMin, 10) : undefined,
      ageMax: req.body.ageMax ? parseInt(req.body.ageMax, 10) : undefined,
    };
    if (req.file) {
      updateData.photoUrl = "/uploads/" + req.file.filename;
    }
    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );
    await db
      .collection(process.env.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    res.redirect("/profile/" + id);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Error updating profile");
  }
});

// (Optional) Test endpoint to create a profile
app.get("/create-test-profile", async (req, res) => {
  const testUser = {
    name: "Test User",
    location: "Amsterdam",
    tags: ["Test", "Demo"],
    languages: ["Dutch", "English"],
    bio: "This is a test profile",
  };
  const result = await db
    .collection(process.env.USER_COLLECTION)
    .insertOne(testUser);
  res.send(`Test profile created with ID: ${result.insertedId}`);
});

//MORE MEETS
function applyFilters(filters) {
  const query = {};

  if (filters.keyword) {
    const keywordRegex = new RegExp(filters.keyword, "i");
    query.$or = [
      { title: keywordRegex },
      { description: keywordRegex },
      { address: keywordRegex },
    ];
  }

  if (filters.address) query.address = filters.address;
  // if (filters.category) query.category = filters.category;
  if (filters.date) query.date = filters.date;

  if (filters.minPeople || filters.maxPeople) {
    query.maxPeople = {};

    if (filters.minPeople) {
      query.maxPeople.$gte = parseInt(filters.minPeople, 10);
    }

    if (filters.maxPeople) {
      query.maxPeople.$lte = parseInt(filters.maxPeople, 10);
    }

    if (Object.keys(query.maxPeople).length === 0) {
      delete query.maxPeople;
    }
  }

  return query;
}

app.get("/more-meets", async (req, res) => {
  const filters = req.query;
  const { keyword, sort } = filters;
  const query = {};

  if (keyword) {
    const searchRegex = new RegExp(keyword, "i");
    query.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { address: searchRegex },
      // { category: searchRegex },
      // { tags: searchRegex },
    ];
  }

  if (filters.address) query.address = filters.address;
  if (filters.category) query.category = filters.category;
  if (filters.date) query.date = filters.date;

  let sortOption = {};
  if (sort === "date_asc") sortOption.date = 1;
  else if (sort === "date_desc") sortOption.date = -1;
  else if (sort === "title_asc") sortOption.title = 1;
  else if (sort === "title_desc") sortOption.title = -1;

  try {
    const meets = await db
      .collection("meets")
      .find(query)
      .sort(sortOption)
      .toArray();
    let user = null;
    if (req.session.userId) {
      user = await db
        .collection(process.env.USER_COLLECTION)
        .findOne({ _id: new ObjectId(req.session.userId) });
    }
    res.render("more-meets", {
      meets,
      keyword,
      address: filters.address || "",
      // category: filters.category || '',
      date: filters.date || "",
      duration: filters.duration || "",
      startDate: filters.startDate || "",
      minPeople: filters.minPeople || "",
      maxPeople: filters.maxPeople || "",
      endDate: filters.endDate || "",
      sort: sort || "",
      userId: req.session.userId || null,
      user,
    });
  } catch (err) {
    console.error("Error fetching meets:", err);
    res.status(500).send("Server error");
  }
});

app.get("/api/meets", async (req, res) => {
  const { keyword, address, date } = req.query;

  const query = {};

  if (keyword) {
    query.$or = [
      { meetingName: new RegExp(keyword, "i") },
      { description: new RegExp(keyword, "i") },
      { address: new RegExp(keyword, "i") },
    ];
  }

  if (address) query.address = address;
  if (date) query.date = date;

  try {
    const meets = await db.collection("meets").find(query).toArray();
    res.json(meets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/users/create-meet", (req, res) => {
  res.render("create-meet", {
    userId: req.session.userId || null,
    user: req.session.user || null,
  });
});

app.get("/meets", async (req, res) => {
  try {
    const userId = req.session.userId?.toString();
    const meets = await db.collection("meets").find({}).toArray();
    // Joined: user is in members array
    const joinedMeets = meets.filter(
      (meet) =>
        Array.isArray(meet.members) && meet.members.some((m) => m.id === userId)
    );
    // Created: user is the creator (assuming meet.creatorId is set)
    const createdMeets = meets.filter((meet) => meet.creatorId === userId);
    res.render("meets", {
      joinedMeets,
      createdMeets,
      userId: req.session.userId || null,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error fetching meets for manage page:", error);
    res.status(500).send("Error fetching meets");
  }
});

// Route to render setup-profile.ejs
app.get("/setup-profile", (req, res) => {
  res.render("setup-profile", { userId: req.session.userId || null });
});

// Handle setup-profile form submission
app.post("/setup-profile", upload.single("photo"), async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }
    // Parse form data
    const {
      firstName,
      lastName,
      bio,
      tags,
      vibe,
      preferredGender,
      dob,
      ageMin,
      ageMax,
      location,
    } = req.body;

    // Age validation
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return res.status(400).render("setup-profile", {
        userId,
        error: "You must be at least 18 years old to create an account.",
      });
    }

    const updateData = {
      firstName,
      lastName,
      bio,
      tags: (tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      vibe,
      preferredGender,
      dob,
      ageMin: parseInt(ageMin, 10),
      ageMax: parseInt(ageMax, 10),
      location,
    };
    if (req.file) {
      updateData.photoUrl = "/uploads/" + req.file.filename;
    }
    await db
      .collection(process.env.USER_COLLECTION)
      .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });
    // Stay logged in and redirect to /home
    res.redirect("/home");
  } catch (error) {
    console.error("Error updating setup-profile:", error);
    res.status(500).send("Error saving profile");
  }
});

// Meet overview page
app.get("/meet/:id", async (req, res) => {
  try {
    const meet = await db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    let user = null;
    let isMember = false;
    let userId = req.session.userId ? req.session.userId.toString() : null;
    if (userId) {
      user = await db
        .collection(process.env.USER_COLLECTION)
        .findOne({ _id: new ObjectId(userId) });
      isMember =
        Array.isArray(meet.members) &&
        meet.members.some((m) => m.id === userId);
    }
    res.render("meet-overview", {
      meet,
      userId,
      user,
      isMember,
    });
  } catch (error) {
    console.error("Error loading meet overview:", error);
    res.status(500).send("Error loading meet overview");
  }
});

// ─── 404 & START SERVER ─────────────────────────────────────────────────
// 404 handler
app.use((_, res) => res.status(404).send("Not Found"));

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
