const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
require("dotenv").config();

const app = express();

// URL-encoded body parser
app.use(express.urlencoded({ extended: true }));
// Static files (css, afbeeldingen, etc.)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Zet de viewengine en de juiste map
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// --- HELPERS ------------------------------------------------------------
async function hashData(plainText) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

async function compareData(plainTextData, hashedData) {
  return bcrypt.compare(plainTextData, hashedData);
}

function verwerkformulier(req, res) {
  // Vervang door je eigen logica
  res.send('Formulier ontvangen: ' + JSON.stringify(req.body));
}

// --- CONNECTIE MET MONGO ------------------------------------------------
const uri = process.env.URI;
const client = new MongoClient(uri);
const db = client.db(process.env.DB_NAME);
const collection = process.env.USER_COLLECTION;

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

// Verwerk formulier
app.post('/form', verwerkformulier);

// --- REGISTRATIE & LOGIN -------------------------------------------------

// Toon registerpagina
app.get('/register', (req, res) => {
  res.render('register', { errors: [] });
});

// Verwerk registratie
app.post('/register', async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.render('register', { errors: result.array() });
  }

  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).render('register', {
      errors: [{ msg: 'Vul alle verplichte velden in: e-mail, naam en wachtwoord' }]
    });
  }

  try {
    const hashedPassword = await hashData(password);
    const user = { email, name, password: hashedPassword };

    if (!db) {
      console.error('Database niet geïnitialiseerd');
      return res.status(500).render('register', {
        errors: [{ msg: 'Serverfout: database niet geïnitialiseerd' }]
      });
    }
    const insertResult = await db.collection('users').insertOne(user);
    console.log('Inserted user:', insertResult.insertedId);
    return res.redirect('/login');
  } catch (error) {
    console.error('Error processing form:', error);
    return res.status(500).render('register', {
      errors: [{ msg: 'Fout bij het registreren: probeer het later opnieuw' }]
    });
  }
});

// Toon loginpagina
app.get('/login', (req, res) => {
  res.render('login', { errors: [] });
});

// Verwerk login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.render('login', {
        errors: [{ msg: 'Ongeldig e-mailadres of wachtwoord' }]
      });
    }
    const isMatch = await compareData(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        errors: [{ msg: 'Ongeldig e-mailadres of wachtwoord' }]
      });
    }
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error processing login:', error);
    return res.status(500).render('login', {
      errors: [{ msg: 'Fout bij het inloggen: probeer het later opnieuw' }]
    });
  }
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
  } catch (err) {
    console.error(err);
    res.status(500).send("Fout bij bijwerken profiel");
  }
});

// --- START SERVER ---------------------------------------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});
