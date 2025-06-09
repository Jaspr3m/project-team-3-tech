const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
require("dotenv").config();

const app = express();

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));
// Static files (css, afbeeldingen, etc.)
app.use("/static", express.static(path.join(__dirname, "static")));

// Zet de viewengine en de juiste map
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

app.use(express.urlencoded({ extended: true }));

require("dotenv").config();

const multer = require("multer");

// Middleware
app
  .use(express.urlencoded({ extended: true }))
  .use("/static", express.static("static"))
  .set("view engine", "ejs");

// MongoDB configuration
const uri = process.env.URI;
const client = new MongoClient(uri);
const db = client.db(process.env.DB_NAME);
const collection = process.env.USER_COLLECTION;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Client connected to database");
  } catch (error) {
    console.error("Error connecting to database:", error);
  }
}
connectDB();

// Hash password function
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

// Compare password function
async function compareData(plainTextData, hashedData) {
  try {
    const match = await bcrypt.compare(plainTextData, hashedData);
    return match;
  } catch (error) {
    console.error("Error comparing data:", error);
    throw error;
  }
}

// Routes

app
  .get("/more-meets", (req, res) => {
    res.render("more-meets");
  })
  .get("/create-test-profile", async (req, res) => {
    const userCollection = db.collection(collection);
    const newUser = {
      name: "Ivy",
      location: "Amsterdam",
      tags: ["Hiking", "Coffee"],
      languages: ["Dutch", "English"],
      bio: "Backpacking across Europe | Love local cafe’s, beach walks and other stuff!",
    };
    try {
      const result = await userCollection.insertOne(newUser);
      res.send("Testprofiel gemaakt met ID: " + result.insertedId);
    } catch (error) {
      console.error("Error creating test profile:", error);
      res.status(500).send("Fout bij het maken van testprofiel");
    }
  })
  .get("/profile/:id", async (req, res) => {
    try {
      const profile = await db
        .collection(collection)
        .findOne({ _id: new ObjectId(req.params.id) });
      const editing = req.query.edit === "true";
      res.render("profile", { profile: profile, editing: editing });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).send("Fout bij het ophalen van profiel");
    }
  })
  .post("/profile/:id", async (req, res) => {
    const updatedProfile = {
      name: req.body.name,
      location: req.body.location,
      tags: req.body.tags,
      languages: req.body.languages,
      bio: req.body.bio,
    };
    try {
      await db
        .collection(collection)
        .updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: updatedProfile }
        );
      res.redirect("/profile/" + req.params.id);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).send("Fout bij het bijwerken van profiel");
    }
  })
  .post("/register", async (req, res) => {
    const result = validationResult(req);
    console.log("result validation", result);

    if (result.isEmpty()) {
      const { email, name, password } = req.body;
      console.log("form data:", req.body);

      if (!email || !name || !password) {
        return res.status(400).render("register.ejs", {
          errors: [
            {
              msg: "Vul alle verplichte velden in: e-mail, naam en wachtwoord",
            },
          ],
        });
      }

      try {
        const hashedPassword = await hashData(password);
        const user = { email, name, password: hashedPassword };

        if (!db) {
          console.error("Database not initialized");
          return res.status(500).render("register.ejs", {
            errors: [{ msg: "Serverfout: database niet geïnitialiseerd" }],
          });
        }

        const insertResult = await db.collection("users").insertOne(user);
        console.log("Inserted user:", insertResult.insertedId);
        return res.redirect("/login");
      } catch (error) {
        console.error("Error processing form:", error);
        return res.status(500).render("register.ejs", {
          errors: [
            { msg: "Fout bij het registreren: probeer het later opnieuw" },
          ],
        });
      }
    } else {
      const errors = result.array();
      console.log("Validation errors:", errors);
      return res.render("register.ejs", { errors });
    }
  })
  .post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.render("login.ejs", {
          errors: [{ msg: "Vul zowel e-mailadres als wachtwoord in" }],
        });
      }

      const user = await db.collection("users").findOne({ email });
      if (!user) {
        return res.render("login.ejs", {
          errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
        });
      }

      const isMatch = await compareData(password, user.password);
      if (!isMatch) {
        return res.render("login.ejs", {
          errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
        });
      }

      return res.redirect("/loginHome");
    } catch (error) {
      console.error("Error processing login:", error);
      return res.status(500).render("login.ejs", {
        errors: [{ msg: "Fout bij het inloggen: probeer het later opnieuw" }],
      });
    }
  });

// --- ROUTES --------------------------------------------------------------

// Homepage
app.get("/", async (req, res) => {
  try {
    const meets = await db.collection("meets").find({}).toArray();
    res.render("homepage", { meets });
  } catch (error) {
    console.error("Error fetching meets:", error);
    res.status(500).send("Fout bij het ophalen van meets");
  }
});

// “More meets”
app.get("/more-meets", (req, res) => {
  res.render("more-meets");
});

// --- REGISTRATIE & LOGIN -------------------------------------------------

// Toon registerpagina
app.get("/register", (req, res) => {
  res.render("register", { errors: [] });
});

// Verwerk registratie
app.post("/register", async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.render("register", { errors: result.array() });
  }

  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).render("register", {
      errors: [
        { msg: "Vul alle verplichte velden in: e-mail, naam en wachtwoord" },
      ],
    });
  }

  try {
    const hashedPassword = await hashData(password);
    const user = { email, name, password: hashedPassword };

    if (!db) {
      console.error("Database niet geïnitialiseerd");
      return res.status(500).render("register", {
        errors: [{ msg: "Serverfout: database niet geïnitialiseerd" }],
      });
    }
    const insertResult = await db.collection("users").insertOne(user);
    console.log("Inserted user:", insertResult.insertedId);
    return res.redirect("/login");
  } catch (error) {
    console.error("Error processing form:", error);
    return res.status(500).render("register", {
      errors: [{ msg: "Fout bij het registreren: probeer het later opnieuw" }],
    });
  }
});

// Toon loginpagina
app.get("/login", (req, res) => {
  res.render("login", { errors: [] });
});

// Verwerk login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.render("login", {
        errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
      });
    }
    const isMatch = await compareData(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
      });
    }
    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Error processing login:", error);
    return res.status(500).render("login", {
      errors: [{ msg: "Fout bij het inloggen: probeer het later opnieuw" }],
    });
  }
});

// Toon loginHome-pagina
app.get("/loginHome", (req, res) => {
  res.render("loginHome");
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.send("<h1>Welkom op je dashboard</h1>");
});

// --- PROFIEL --------------------------------------------------------------

// Maak test-profiel
app.get("/create-test-profile", async (req, res) => {
  const userCollection = db.collection(collection);
  const newUser = {
    name: "Ivy",
    location: "Amsterdam",
    tags: ["Hiking", "Coffee"],
    languages: ["Dutch", "English"],
    bio: "Backpacking across Europe | Love local café’s, beach walks en andere dingen!",
  };
  const result = await userCollection.insertOne(newUser);
  res.send("Testprofiel gemaakt met ID: " + result.insertedId);
});

// Profiel tonen
app.get("/profile/:id", async (req, res) => {
  try {
    const profile = await db
      .collection(collection)
      .findOne({ _id: new ObjectId(req.params.id) });
    const editing = req.query.edit === "true";
    res.render("profile", { profile, editing });
  } catch (err) {
    console.error(err);
    res.status(500).send("Fout bij ophalen profiel");
  }
});

// Profiel bijwerken
app.post("/profile/:id", async (req, res) => {
  const updatedProfile = {
    name: req.body.name,
    location: req.body.location,
    tags: req.body.tags,
    languages: req.body.languages,
    bio: req.body.bio,
  };
  try {
    await db
      .collection(collection)
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updatedProfile }
      );
    res.redirect("/profile/" + req.params.id);
  } catch {
    console.log(error);
  }
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

const userRoutes = require("./routes/user");

app.use("/user", userRoutes);

// --- NEW ROUTES FOR NEW VIEWS ---

// All meets overview
app.get("/meets", async (req, res) => {
  try {
    const meets = await db.collection("meets").find({}).toArray();
    res.render("meets", { meets });
  } catch (error) {
    console.error("Error fetching meets:", error);
    res.status(500).send("Fout bij het ophalen van meets");
  }
});

// Single meet overview
app.get("/meet/:id", async (req, res) => {
  try {
    const meet = await db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) return res.status(404).send("Meet not found");
    // For now, isMember and userId are placeholders
    res.render("meet-overview", { meet, isMember: false, userId: null });
  } catch (error) {
    console.error("Error fetching meet:", error);
    res.status(500).send("Fout bij het ophalen van meet");
  }
});

// All users overview
app.get("/users", async (req, res) => {
  try {
    // Example: only show users with a 'voornaam' property
    const users = await db
      .collection("users")
      .find({ voornaam: { $exists: true } })
      .toArray();
    res.render("users", { users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Fout bij het ophalen van users");
  }
});

app.listen(3000);
console.log("Server listening @ localhost:3000!");

/*
http://localhost:3000/
http://localhost:3000/more-meets

Authentication:
http://localhost:3000/register
http://localhost:3000/login
http://localhost:3000/loginHome
http://localhost:3000/dashboard

Profile:
http://localhost:3000/create-test-profile
http://localhost:3000/profile/:id

Other:
http://localhost:3000/form
*/
