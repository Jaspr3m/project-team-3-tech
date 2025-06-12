const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
require("dotenv").config();

const app = express();

const saltRounds = 10

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));
// Static files (css, afbeeldingen, etc.)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Zet de viewengine en de juiste map
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

app.use(express.urlencoded({ extended: true }))

require("dotenv").config();

const multer = require('multer');


// MongoDB configuration
const uri = process.env.URI;
const client = new MongoClient(uri);
const db = client.db(process.env.DB_NAME);
const collection = process.env.USER_COLLECTION;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('Client connected to database');
  } catch (error) {
    console.error('Error connecting to database:', error);
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
    console.error('Error hashing data:', error);
    throw error;
  }
}

// Compare password function
async function compareData(plainTextData, hashedData) {
  try {
    const match = await bcrypt.compare(plainTextData, hashedData);
    return match;
  } catch (error) {
    console.error('Error comparing data:', error);
    throw error;
  }
}

// Routes


app
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
    const updatedProfile = {
      name: req.body.name,
      location: req.body.location,
      tags: req.body.tags,
      languages: req.body.languages,
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







async function connectDB() {
  try {
    await client.connect();
    console.log("Client connected to database");
  } catch (error) {
    console.error(error);
  }
}
connectDB();

// --- ROUTES --------------------------------------------------------------

// Homepage
app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1> <img src="/static/images/snoopy.jpg" alt="Poster" width="50%"/>');
});

app.get('/about', (req, res) => {
  res.send(`<h1>About me!</h1> <img src="/static/images/postermockup.png" alt="Poster" width="50%"/>`);
});

// Song detail
app.get('/songList', (req, res) => {
  const song = {
    title: 'FAMJAM400',
    description: 'You watched me grow up from a...'
  };
  res.render('detail', { data: song });
});

// “More meets”
app.get('/more-meets', (req, res) => {
  res.render('more-meets');
});



// --- REGISTRATIE & LOGIN -------------------------------------------------

// Toon registerpagina
app.get('/register', (req, res) => {
  res.render('register', {
    errors: [],
    formData: { email: '', name: '' }
  });
});
// Verwerk registratie

// Toon loginpagina
app.get('/login', (req, res) => {
  res.render('login', {
    errors: [],
    formData: { email: '' }
  });
});



// Toon loginHome-pagina
app.get('/loginHome', (req, res) => {
  res.render('loginHome');
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.send('<h1>Welkom op je dashboard</h1>');
});

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
// --- PROFIEL --------------------------------------------------------------

// Maak test-profiel
app.get('/create-test-profile', async (req, res) => {
  const userCollection = db.collection(collection);
  const newUser = {
    name: "Ivy",
    location: "Amsterdam",
    tags: ["Hiking", "Coffee"],
    languages: ["Dutch", "English"],
    bio: "Backpacking across Europe | Love local café’s, beach walks en andere dingen!"
  };
  const result = await userCollection.insertOne(newUser);
  res.send("Testprofiel gemaakt met ID: " + result.insertedId);
});

// Profiel tonen
app.get('/profile/:id', async (req, res) => {
  try {
    const profile = await db.collection(collection).findOne({ _id: new ObjectId(req.params.id) });
    const editing = req.query.edit === 'true';
    res.render('profile', { profile, editing });
  } catch (err) {
    console.error(err);
    res.status(500).send("Fout bij ophalen profiel");
  }
});

// Profiel bijwerken
app.post('/profile/:id', async (req, res) => {
  const updatedProfile = {
    name: req.body.name,
    location: req.body.location,
    tags: req.body.tags,
    languages: req.body.languages,
    bio: req.body.bio
  };
  try {
    await db.collection(collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedProfile }
    );
    res.redirect("/profile/" + req.params.id);
  } catch {

  }


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

app.listen(8000)