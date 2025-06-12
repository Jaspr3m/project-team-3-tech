const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
<<<<<<< HEAD
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
=======
const bcrypt = require("bcryptjs");
const saltRounds = 10;
const { validationResult } = require("express-validator");
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
require("dotenv").config();

const app = express();

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));
// Static files (css, afbeeldingen, etc.)
app.use("/static", express.static(path.join(__dirname, "static")));

// Zet de viewengine en de juiste map
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

app.use(express.urlencoded({ extended: true }))


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
<<<<<<< HEAD
    console.log('Client connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error);
=======
    console.log("Client connected to database");
  } catch (error) {
    console.error("Error connecting to database:", error);
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
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
<<<<<<< HEAD
    console.error('Error hashing data:', error);
=======
    console.error("Error hashing data:", error);
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
    throw error;
  }
}

// Compare password function
async function compareData(plainTextData, hashedData) {
  try {
    const match = await bcrypt.compare(plainTextData, hashedData);
    return match;
  } catch (error) {
<<<<<<< HEAD
    console.error('Error comparing data:', error);
=======
    console.error("Error comparing data:", error);
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
    throw error;
  }
}

// Routes

app
<<<<<<< HEAD
  .get('/more-meets', (req, res) => {
    res.render('more-meets');
  })
  .get('/create-test-profile', async (req, res) => {
    const userCollection = db.collection(collection);
    const newUser = {
      name: 'Ivy',
      location: 'Amsterdam',
      tags: ['Hiking', 'Coffee'],
      languages: ['Dutch', 'English'],
      bio: 'Backpacking across Europe | Love local cafe’s, beach walks and other stuff!'
    };
    try {
      const result = await userCollection.insertOne(newUser);
      res.send('Testprofiel gemaakt met ID: ' + result.insertedId);
    } catch (error) {
      console.error('Error creating test profile:', error);
      res.status(500).send('Fout bij het maken van testprofiel');
    }
  })
  .get('/profile/:id', async (req, res) => {
    try {
      const profile = await db.collection(collection).findOne({ _id: new ObjectId(req.params.id) });
      const editing = req.query.edit === 'true';
      res.render('profile', { profile: profile, editing: editing });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).send('Fout bij het ophalen van profiel');
    }
  })
  .post('/profile/:id', async (req, res) => {
=======
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
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
    const updatedProfile = {
      name: req.body.name,
      location: req.body.location,
      tags: req.body.tags,
      languages: req.body.languages,
<<<<<<< HEAD
      bio: req.body.bio
    };
    try {
      await db.collection(collection).updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updatedProfile }
      );
      res.redirect('/profile/' + req.params.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Fout bij het bijwerken van profiel');
    }
  })


  .post('/register', [
    body('email')
      .isEmail()
      .withMessage('Fill in a valid E-mail adress'),
    body('name')
      .notEmpty()
      .withMessage('Fill in your name'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must contain atleast 6 charachters')
  ],
    async (req, res) => {
      // check the results of the above validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // render the form again, passing the array of errors
        return res.status(400).render('register', {
          errors: errors.array(),
          formData: {
            email: req.body.email,
            name: req.body.name,
            // we laten password wél leeg—gebruikers typen dat beter niet voor
            // value terug in
          }
        });
      }

      // at this point email, name and password are all "good"
      const { email, name, password } = req.body;
      try {
        const hashedPassword = await hashData(password);
        const user = { email, name, password: hashedPassword };
        const insertResult = await db.collection('users').insertOne(user);
        console.log('Inserted user:', insertResult.insertedId);
        return res.redirect('/home');
      } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).render('register', {
          errors: [{ msg: 'Something went wrong with registering your account' }]
        });
      }
    });

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Missing fields
  if (!email || !password) {
    return res.render('login', {
      errors: [{ msg: 'Fill in your e-mail and password' }],
      formData: { email }
    });
  }

  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.render('login', {
        errors: [{ msg: 'Invalid e-mail or password' }],
        formData: { email }
      });
    }

    const isMatch = await compareData(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        errors: [{ msg: 'Invalid e-mail or password' }],
        formData: { email }
      });
    }

    return res.redirect('/home');
  } catch (error) {
    console.error('Error processing login:', error);
    return res.status(500).render('login', {
      errors: [{ msg: 'Server error, please try again later.' }],
      formData: { email }
    });
  }
});


// Route handlers
function onhome(req, res) {
  res.send('<h1>Hello World!</h1> <img src="/static/images/snoopy.jpg" alt="Poster" width="50%"/>');
}

function onabout(req, res) {
  res.send(`<h1>About me!</h1> <img src="/static/images/postermockup.png" alt="Poster" width="50%"/>`);
}

function song(req, res) {
  let song = {
    title: 'FAMJAM400',
    description: 'You watched me grow up from a...'
  }

  res.render('detail.ejs', { data: song })
}
=======
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
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c

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


// --- ROUTES --------------------------------------------------------------

// Homepage
//app.get("/", async (req, res) => {
//   try {
//     const meets = await db.collection("meets").find({}).toArray();
//     res.render("homepage", { meets });
//   } catch (error) {
//     console.error("Error fetching meets:", error);
//     res.status(500).send("Fout bij het ophalen van meets");
//   }
// });

// “More meets”
// app.get("/more-meets", (req, res) => {
//   res.render("more-meets");
// });

// --- REGISTRATIE & LOGIN -------------------------------------------------

// Toon registerpagina
<<<<<<< HEAD
app.get('/register', (req, res) => {
  res.render('register', {
    errors: [],
    formData: { email: '', name: '' }
  });
=======
// app.get("/register", (req, res) => {
//   res.render("register", { errors: [] });
// });

// Verwerk registratie
// app.post("/register", async (req, res) => {
//   const result = validationResult(req);
//   if (!result.isEmpty()) {
//     return res.render("register", { errors: result.array() });
//   }

//   const { email, name, password } = req.body;
//   if (!email || !name || !password) {
//     return res.status(400).render("register", {
//       errors: [
//         { msg: "Vul alle verplichte velden in: e-mail, naam en wachtwoord" },
//       ],
//     });
//   }

//   try {
//     const hashedPassword = await hashData(password);
//     const user = { email, name, password: hashedPassword };

//     if (!db) {
//       console.error("Database niet geïnitialiseerd");
//       return res.status(500).render("register", {
//         errors: [{ msg: "Serverfout: database niet geïnitialiseerd" }],
//       });
//     }
//     const insertResult = await db.collection("users").insertOne(user);
//     console.log("Inserted user:", insertResult.insertedId);
//     return res.redirect("/login");
//   } catch (error) {
//     console.error("Error processing form:", error);
//     return res.status(500).render("register", {
//       errors: [{ msg: "Fout bij het registreren: probeer het later opnieuw" }],
//     });
//   }
// });

// Toon loginpagina
// app.get("/login", (req, res) => {
//   res.render("login", { errors: [] });
// });

// Verwerk login
// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await db.collection("users").findOne({ email });
//     if (!user) {
//       return res.render("login", {
//         errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
//       });
//     }
//     const isMatch = await compareData(password, user.password);
//     if (!isMatch) {
//       return res.render("login", {
//         errors: [{ msg: "Ongeldig e-mailadres of wachtwoord" }],
//       });
//     }
//     return res.redirect("/dashboard");
//   } catch (error) {
//     console.error("Error processing login:", error);
//     return res.status(500).render("login", {
//       errors: [{ msg: "Fout bij het inloggen: probeer het later opnieuw" }],
//     });
//   }
// });

// Toon loginHome-pagina
// app.get("/loginHome", (req, res) => {
//   res.render("loginHome");
// });

// Dashboard
// app.get("/dashboard", (req, res) => {
//   res.send("<h1>Welkom op je dashboard</h1>");
// });

// --- PROFIEL --------------------------------------------------------------

// Maak test-profiel
// app.get("/create-test-profile", async (req, res) => {
//   const userCollection = db.collection(collection);
//   const newUser = {
//     name: "Ivy",
//     location: "Amsterdam",
//     tags: ["Hiking", "Coffee"],
//     languages: ["Dutch", "English"],
//     bio: "Backpacking across Europe | Love local café’s, beach walks en andere dingen!",
//   };
//   const result = await userCollection.insertOne(newUser);
//   res.send("Testprofiel gemaakt met ID: " + result.insertedId);
// });

// Profiel tonen
// app.get("/profile/:id", async (req, res) => {
//   try {
//     const profile = await db
//       .collection(collection)
//       .findOne({ _id: new ObjectId(req.params.id) });
//     const editing = req.query.edit === "true";
//     res.render("profile", { profile, editing });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Fout bij ophalen profiel");
//   }
// });

// Profiel bijwerken
// app.post("/profile/:id", async (req, res) => {
//   const updatedProfile = {
//     name: req.body.name,
//     location: req.body.location,
//     tags: req.body.tags,
//     languages: req.body.languages,
//     bio: req.body.bio,
//   };
//   try {
//     await db
//       .collection(collection)
//       .updateOne(
//         { _id: new ObjectId(req.params.id) },
//         { $set: updatedProfile }
//       );
//     res.redirect("/profile/" + req.params.id);
//   } catch {
//     console.log(error);
//   }
// });

// function showRegister(req, res) {
//   res.render("register.ejs", { errors: [] });
// }

// function showLogin(req, res) {
//   res.render("login.ejs", { errors: [] });
// }

// function showLoginHome(req, res) {
//   res.render("loginHome.ejs", { errors: [] });
// }

// const userRoutes = require("./routes/user");

// app.use("/user", userRoutes);

// --- NEW ROUTES FOR NEW VIEWS ---

// All meets overview
// app.get("/meets", async (req, res) => {
//   try {
//     const meets = await db.collection("meets").find({}).toArray();
//     res.render("meets", { meets });
//   } catch (error) {
//     console.error("Error fetching meets:", error);
//     res.status(500).send("Fout bij het ophalen van meets");
//   }
// });

// Single meet overview
// app.get("/meet/:id", async (req, res) => {
//   try {
//     const meet = await db
//       .collection("meets")
//       .findOne({ _id: new ObjectId(req.params.id) });
//     if (!meet) return res.status(404).send("Meet not found");
    // For now, isMember and userId are placeholders
//     res.render("meet-overview", { meet, isMember: false, userId: null });
//   } catch (error) {
//     console.error("Error fetching meet:", error);
//     res.status(500).send("Fout bij het ophalen van meet");
//   }
// });

// app.get("/api/meets", async (req, res) => {
//   const { location, category, date, keyword } = req.query;

//   const query = {};

//   if (location) query.location = location;
//   if (category) query.category = category;
//   if (date) query.date = date;

//   if (keyword) {
//     query.$or = [
//       { meetingName: { $regex: keyword, $options: "i" } },
//       { description: { $regex: keyword, $options: "i" } },
//       { location: { $regex: keyword, $options: "i" } }
//     ];
//   }

//   try {
//     const meets = await db.collection("meets").find(query).toArray();
//     res.json(meets);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch meets" });
//   }
// });




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
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
});
// Verwerk registratie
<<<<<<< HEAD

// Toon loginpagina
app.get('/login', (req, res) => {
  res.render('login', {
    errors: [],
    formData: { email: '' }
  });
});


=======
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
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c

// Toon loginHome-pagina
app.get("/loginHome", (req, res) => {
  res.render("loginHome");
});


// Dashboard
app.get("/dashboard", (req, res) => {
  res.send("<h1>Welkom op je dashboard</h1>");
});

<<<<<<< HEAD
// homepage: 
app.get('/home', (req, res) => {
  const meetings = [
    {
      _id: '1',
      title: 'Beach Walk',
      username: 'jasprem_is_cool123',
      time: new Date('2025-05-22T14:00:00'),
      profileImage: '/static/images/profiel.svg'
    },
    {
      _id: '2',
      title: 'Mountain Hike',
      username: 'kioko_mickey',
      time: new Date('2025-05-22T16:30:00'),
      profileImage: '/static/images/profiel.svg'
    },
    {
      _id: '1',
      title: 'Beach Walk',
      username: 'jasprem_is_cool123',
      time: new Date('2025-05-22T14:00:00'),
      profileImage: '/static/images/profiel.svg'
    },
    {
      _id: '2',
      title: 'Mountain Hike',
      username: 'kioko_mickey',
      time: new Date('2025-05-22T16:30:00'),
      profileImage: '/static/images/profiel.svg'
    },
    {
      _id: '1',
      title: 'Beach Walk',
      username: 'jasprem_is_cool123',
      time: new Date('2025-05-22T14:00:00'),
      profileImage: '/static/images/profiel.svg'
    },
    {
      _id: '2',
      title: 'Mountain Hike',
      username: 'kioko_mickey',
      time: new Date('2025-05-22T16:30:00'),
      profileImage: '/static/images/profiel.svg'
    }
  ];

  res.render('homepage', { meetings });
});
=======
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c
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
<<<<<<< HEAD


  function showRegister(req, res) {
    res.render('register.ejs', { errors: [] });
  }

  function showLogin(req, res) {
    res.render('login.ejs', { errors: [] });
  }

  function showLoginHome(req, res) {
    res.render('loginHome.ejs', { errors: [] });
  }
})
=======
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
>>>>>>> 65d95be0885a3e48d3eba12427ceecb48d6cfa7c

const userRoutes = require("./routes/user");


app.use("/user", userRoutes);

// --- NEW ROUTES FOR NEW VIEWS ---

// All meets overview
app.get("/meets", async (req, res) => {
  const user = getCurrentUser(req);
  try {
    const meets = await db
      .collection("meets")
      .find({ "members.id": user.id })
      .toArray();
    res.render("meets", { meets, user });
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
    const user = getCurrentUser(req);
    // Check if user is a member by id
    const isMember =
      Array.isArray(meet.members) && meet.members.some((m) => m.id === user.id);
    res.render("meet-overview", {
      meet,
      isMember,
      userId: user.id,
      userName: user.name,
    });
  } catch (error) {
    console.error("Error fetching meet:", error);
    res.status(500).send("Fout bij het ophalen van meet");
  }
});


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


// Simulate a logged-in user (replace with real session logic later)
function getCurrentUser(req) {
  // For demo purposes, return a hardcoded user object
  return { id: "demoUserId", name: "Demo User" };
}

// Join a meet
app.post("/meet/:id/join", async (req, res) => {
  const user = getCurrentUser(req);
  try {
    await db
      .collection("meets")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { members: { id: user.id, name: user.name } } }
      );
    res.redirect("/meet/" + req.params.id);
  } catch (error) {
    console.error("Error joining meet:", error);
    res.status(500).send("Fout bij het joinen van meet");
  }
});

// Leave a meet
app.post("/meet/:id/cancel", async (req, res) => {
  const user = getCurrentUser(req);
  try {
    await db
      .collection("meets")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { members: { id: user.id } } }
      );
    res.redirect("/meet/" + req.params.id);
  } catch (error) {
    console.error("Error leaving meet:", error);
    res.status(500).send("Fout bij het verlaten van meet");
  }
});

app.listen(3000);
console.log("Server listening @ http://localhost:3000!");
console.log(`\nImportant routes:\n
Homepage:           http://localhost:3000/
More meets:         http://localhost:3000/more-meets
Register:           http://localhost:3000/register
Login:              http://localhost:3000/login
Login Home:         http://localhost:3000/loginHome
Dashboard:          http://localhost:3000/dashboard
Create Test Profile:http://localhost:3000/create-test-profile
Profile:            http://localhost:3000/profile/:id
All Meets:          http://localhost:3000/meets
Create Meet:        http://localhost:3000/user/create-meet
Meet Overview:      http://localhost:3000/meet/:id
`);

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
