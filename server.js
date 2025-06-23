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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



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

// Helper: compare plaintext to hashed data
async function compareData(plainText, hashed) {
  try {
    return await bcrypt.compare(plainText, hashed);
  } catch (err) {
    console.error("Error comparing data:", err);
    throw err;
  }
}

// ─── MIDDLEWARE: Require Login ─────────────────────────────
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
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
    body("email").isEmail().withMessage("Fill in a valid E-mail address"),
    body("name").notEmpty().withMessage("Fill in your name"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must contain at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { email, name, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("register", {
        errors: errors.array(),
        formData: { email, name },
      });
    }

    try {

      const hashedPw = await bcrypt.hash(password, saltRounds);
      const result = await db
        .collection(process.env.USER_COLLECTION)
        .insertOne({ email, name, password: hashedPw });

      // log de gebruiker in
      req.session.userId = result.insertedId;

      // redirect to setup-profile after registration
      return res.redirect("/setup-profile");

    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).render("register", {
        errors: [{ msg: "Something went wrong, please try again later." }],
        formData: { email, name },
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
      name: req.body.name,
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

//MORE MEETS (KIOKO)//
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
      await db
        .collection(process.env.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      res.redirect("/home");
    } catch (error) {
      console.error("Error updating setup profile:", error);
      res.status(500).send("Error saving profile setup");
    }
  }
);

//------------------------ MORE MEETS ------------------------ 
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

  if (filters.location) {
    query.location = filters.location;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.address) {
    query.address = new RegExp(filters.address, 'i');
  }

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = filters.startDate;
    if (filters.endDate) query.date.$lte = filters.endDate;
  }

  if (filters.minPeople || filters.maxPeople) {
    query.maxPeople = {};
    if (filters.minPeople) query.maxPeople.$gte = parseInt(filters.minPeople, 10);
    if (filters.maxPeople) query.maxPeople.$lte = parseInt(filters.maxPeople, 10);

    if (Object.keys(query.maxPeople).length === 0) {
      delete query.maxPeople;
    }
  }

  return query;
}

// Kioko

app.get("/more-meets", async (req, res) => {
  const filters = req.query;
  const { keyword, sort } = filters;


  const query = applyFilters(filters);

  
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
    res.render("more-meets", {
      meets,
      keyword,
      location: filters.location || "",
      category: filters.category || "",
      address: filters.address || "",
      date: filters.date || "",
      startDate: filters.startDate || "",
      minPeople: filters.minPeople || "",
      maxPeople: filters.maxPeople || "",
      endDate: filters.endDate || "",
      sort: sort || "",
      userId: req.session.userId || null,
      user: req.session.user || null,
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

// log out in profile

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/loginHome');
  });
});


// ─── MEETS API ──────────────────────────────────────────────────
app.get('/api/meets', async (req, res) => {
  const { keyword, address, date } = req.query;

  const query = {};

  if (keyword) {
    const regex = new RegExp(keyword, 'i');
    query.$or = [
      { meetingName: regex },
      { description: regex },
      { address:     regex },
    ];
  }

  if (address) {
    query.address = address;
  }
  if (date) {
    query.date = date;
  }

  try {
    const meets = await db.collection('meets').find(query).toArray();
    return res.json(meets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});



// CREATA MEETS

app.get("/create-meet", (req, res) => {
  res.render("create-meet", {
    userId: req.session.userId || null,
    user: req.session.user || null,
  });
});

// CREATE MEET (POST)
app.post("/create-meet", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.render("create-meet", {
        error: "You must upload a cover image to create a meet.",
        userId: req.session.userId || null,
        user: req.session.user || null,
      });
    }
    // Save the meet to the database
    const userId = req.session.userId ? req.session.userId.toString() : null;
    const meet = {
      title: req.body.title,
      description: req.body.description,
      maxPeople: parseInt(req.body.maxPeople, 10),
      date: req.body.date,
      time: req.body.time,
      location: req.body.location,
      category: req.body.category,
      address: req.body.address,
      image: "/uploads/" + req.file.filename,
      members: userId ? [{ id: userId }] : [], // Automatically add creator as member
      creatorId: userId,
      createdAt: new Date(),
    };
    await db.collection("meets").insertOne(meet);
    res.redirect("/meets");
  } catch (error) {
    console.error("Error creating meet:", error);
    res.status(500).render("create-meet", {
      error: "Server error. Please try again later.",
      userId: req.session.userId || null,
      user: req.session.user || null,
    });
  }
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

app.get("/meet/:id", async (req, res) => {
  try {
    const meet = await db.collection("meets").findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    let isMember = false;
    let currentUser = null;
    if (req.session.userId) {
      isMember = (meet.members || []).some(
        (m) => m === req.session.userId.toString() || (m.id && m.id === req.session.userId.toString())
      );
      currentUser = await db.collection(process.env.USER_COLLECTION).findOne({ _id: new ObjectId(req.session.userId) });
    }
    // Get all users who are members of this meet (except current user)
    const memberIds = (meet.members || [])
      .map((m) => (typeof m === 'object' && m.id ? m.id : m.toString()))
      .filter((id) => id && (!req.session.userId || id !== req.session.userId.toString()));
    let userMatches = [];
    if (memberIds.length > 0 && currentUser) {
      const users = await db.collection(process.env.USER_COLLECTION).find({ _id: { $in: memberIds.map(id => new ObjectId(id)) } }).toArray();
      // Matching algorithm
      userMatches = users.map(user => {
        let matchScore = 0;
        // Vibe match
        if (user.vibe && currentUser.vibe && user.vibe === currentUser.vibe) matchScore += 40;
        // Preferred Gender match
        if (
          (!user.preferredGender || user.preferredGender === 'any' || user.preferredGender === currentUser.preferredGender) &&
          (!currentUser.preferredGender || currentUser.preferredGender === 'any' || currentUser.preferredGender === user.preferredGender)
        ) matchScore += 30;
        // Age range overlap
        if (user.ageMin && user.ageMax && currentUser.ageMin && currentUser.ageMax) {
          const overlap = Math.max(0, Math.min(user.ageMax, currentUser.ageMax) - Math.max(user.ageMin, currentUser.ageMin));
          if (overlap > 0) matchScore += 30;
        }
        return { user, matchScore };
      });
      // Sort by matchScore descending
      userMatches.sort((a, b) => b.matchScore - a.matchScore);
    }
    res.render("meet-overview", {
      meet,
      userId: req.session.userId,
      isMember,
      userMatches,
    });
  } catch (error) {
    console.error("Error loading meet detail:", error);
    res.status(500).send("Error loading meet detail");
  }
});



app.get("/create-meet", (req, res) => {
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

// Meet overview page
app.get("/meet/:id", async (req, res) => {
  try {
    const meet = await db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    let isMember = false;
    if (req.session.userId) {
      isMember = (meet.members || []).some(
        (m) => m.toString() === req.session.userId.toString()
      );
    }

    // Fetch only users who are members of this meet (not all users)
    const memberIds = (meet.members || [])
      .map((m) => m.id)
      .filter(Boolean)
      .map((id) => new ObjectId(id));

    const joinedUsers = await db
      .collection(process.env.USER_COLLECTION)
      .find({ _id: { $in: memberIds } })
      .toArray();

    // Helper: calculate match score
    function calculateMatchScore(userProfile, meet) {
      let score = 0;
      // Age range match (if available)
      if (
        userProfile.ageMin &&
        userProfile.ageMax &&
        meet.ageMin &&
        meet.ageMax
      ) {
        // Overlap in age range
        const overlap = Math.max(
          0,
          Math.min(userProfile.ageMax, meet.ageMax) -
            Math.max(userProfile.ageMin, meet.ageMin)
        );
        if (overlap > 0) score += 40;
      }
      // Gender match (if available)
      if (meet.preferredGender && userProfile.preferredGender) {
        if (
          meet.preferredGender === "any" ||
          userProfile.preferredGender === "any" ||
          meet.preferredGender === userProfile.preferredGender
        ) {
          score += 30;
        }
      }
      // Vibe match (if available)
      if (meet.vibe && userProfile.vibe && meet.vibe === userProfile.vibe) {
        score += 30;
      }
      return score;
    }

    // Calculate and sort matches only among joined users
    const userMatches = joinedUsers
      .map((u) => ({
        user: u,
        matchScore: calculateMatchScore(u, meet),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    res.render("meet-overview", {
      meet,
      userId,
      user,
      isMember,
      userMatches, // Only joined users, sorted by match
    });
  } catch (error) {
    console.error("Error loading meet overview:", error);
    res.status(500).send("Error loading meet overview");
  }
});

// Join Meet (add user to members array)
app.post("/meet/:id/join", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }
    const meetId = req.params.id;
    const userId = req.session.userId.toString();
    const meet = await db.collection("meets").findOne({ _id: new ObjectId(meetId) });
    if (!meet) {
      return res.status(404).json({ error: "Meet not found" });
    }
    // Check if already a member
    const alreadyMember = (meet.members || []).some(m => m.id === userId);
    if (!alreadyMember) {
      await db.collection("meets").updateOne(
        { _id: new ObjectId(meetId) },
        { $push: { members: { id: userId } } }
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error joining meet:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── EDIT MEET ─────────────────────────────────────────────
app.get("/edit-meet/:id", requireLogin, async (req, res) => {
  try {
    const meet = await db.collection("meets").findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    // Only the creator can edit
    if (meet.creatorId !== req.session.userId.toString()) {
      return res.status(403).send("You are not authorized to edit this meet.");
    }
    res.render("edit-meet", {
      meet,
      userId: req.session.userId || null,
      user: req.session.user || null,
      error: null
    });
  } catch (error) {
    console.error("Error loading meet for edit:", error);
    res.status(500).send("Error loading meet for edit");
  }
});

app.post("/edit-meet/:id", requireLogin, upload.single("image"), async (req, res) => {
  try {
    const meet = await db.collection("meets").findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) {
      return res.status(404).send("Meet not found");
    }
    if (meet.creatorId !== req.session.userId.toString()) {
      return res.status(403).send("You are not authorized to edit this meet.");
    }
    // Prepare update data
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      maxPeople: parseInt(req.body.maxPeople, 10),
      date: req.body.date,
      time: req.body.time,
      location: req.body.location,
      category: req.body.category,
      address: req.body.address,
    };
    if (req.file) {
      updateData.image = "/uploads/" + req.file.filename;
    }
    await db.collection("meets").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    res.redirect("/meet/" + req.params.id);
  } catch (error) {
    console.error("Error updating meet:", error);
    res.status(500).render("edit-meet", {
      meet: Object.assign({}, req.body, { _id: req.params.id }),
      userId: req.session.userId || null,
      user: req.session.user || null,
      error: "Server error. Please try again later."
    });
  }
});

// ─── DELETE MEET ─────────────────────────────────────────────
app.post("/delete-meet/:id", requireLogin, async (req, res) => {
  try {
    const meetId = req.params.id;
    const userId = req.session.userId.toString();
    const meet = await db.collection("meets").findOne({ _id: new ObjectId(meetId) });
    if (!meet) {
      return res.status(404).json({ error: "Meet not found" });
    }
    if (meet.creatorId !== userId) {
      return res.status(403).json({ error: "You are not authorized to delete this meet." });
    }
    await db.collection("meets").deleteOne({ _id: new ObjectId(meetId) });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting meet:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Mount user routes
const userRoutes = require("./routes/user");
app.use("/users", userRoutes);

// 404 handler (should be last)
app.use((_, res) => res.status(404).send("Not Found"));




// ─── START SERVER ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});






