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

      // redirect naar de bestaande `/profile/:id` route
      return res.redirect(`/profile/${result.insertedId}`);
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
app.get("/profile/:id", async (req, res) => {
  try {
    const profile = await db
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

      const updateData = {
        name: req.body.name,
        location: req.body.location,
        tags,
        languages,
        bio: req.body.bio,
      };
      if (req.file) {
        updateData.photoUrl = "/uploads/" + req.file.filename;
      }

      await db
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
    });
  } catch (err) {
    console.error("Error fetching meets:", err);
    res.status(500).send("Server error");
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/login');
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

// notifcications
// ─── SOCKET.IO SETUP ──────────────────────────────────────────
// const http     = require('http');
// const socketio = require('socket.io');
// const server   = http.createServer(app);
// const io       = socketio(server);

// io.on('connection', socket => {
//   socket.on('joinMeetRoom', meetId => {
//     socket.join(`meet_${meetId}`);
//   });
// });

// // ─── NOTIFICATIONS ROUTE ───────────────────────────────────────
// app.get('/notifications', async (req, res, next) => {
//   try {
//     if (!req.session.userId) return res.redirect('/login');

//     const items = await Notification
//       .find({ user: req.session.userId })
//       .sort({ createdAt: -1 })
//       .limit(50)
//       .lean();

//     await Notification.updateMany(
//       { user: req.session.userId, isRead: false },
//       { $set: { isRead: true } }
//     );

//     res.render('notifications', {
//       notifications: items,
//       userId: req.session.userId
//     });
//   } catch (err) {
//     next(err);
//   }
// });

// app.use(async (req, res, next) => {
//   if (req.session.userId) {
//     const user = await db.collection(process.env.USER_COLLECTION)
//       .findOne({ _id: new ObjectId(req.session.userId) });
//     res.locals.currentUser = user;
//   } else {
//     res.locals.currentUser = null;
//   }
//   next();
// });
// ─── 404 HANDLER ──────────────────────────────────────────────────


// ─── START SERVER ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});






