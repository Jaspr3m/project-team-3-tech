// server.js
const express       = require('express');
const path          = require('path');
const session       = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt        = require('bcryptjs');
const multer        = require('multer');
const { validationResult } = require('express-validator');
require('dotenv').config();

const app = express();

// Bodyparser, statics & sessions
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'static/uploads')));
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24*60*60*1000 }
}));

// View‐engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// MongoDB
const client = new MongoClient(process.env.URI);
const db     = client.db(process.env.DB_NAME);
const USERS  = process.env.USER_COLLECTION;
client.connect().then(() => console.log('✅ DB connected'));

// Protect routes
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}


// ─── AUTH: register & login ─────────────────────────────────────────────
app.get('/register', (req, res) => res.render('register', { errors: [] }));
app.post('/register', async (req, res) => {
  const { email, name, password } = req.body;
  const errors = [];
  if (!email || !name || !password) errors.push({ msg: 'Vul alle velden in' });
  if (errors.length) return res.render('register', { errors });

  const hash = await bcrypt.hash(password, 10);
  await db.collection(USERS).insertOne({ email, name, password: hash });
  res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login', { errors: [] }));
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


// ─── HOMEPAGE (dummy data) ───────────────────────────────────────────────
app.get('/homepage', requireLogin, (req, res) => {
  const meetings = [
    { _id: '1', title: 'Beach Walk', username: 'alice',   time: new Date(), profileImage: '/static/images/profiel.svg' },
    { _id: '2', title: 'Mountain Hike', username: 'bob', time: new Date(), profileImage: '/static/images/profiel.svg' },
  ];
  res.render('homepage', {
    meetings,
    userId: req.session.userId
  });
});

// ─── TEST PROFILE CREATION ───────────────────────────────────────────────
// multer voor foto uploaden en  stuff
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
   
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});


const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },  // 2 MB
  fileFilter: (_, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Alleen afbeeldingen toegestaan'))
});


// Toon profiel (met ?edit=true voor bewerken)
app.get('/profile/:id', requireLogin, async (req, res) => {
  const profile = await db.collection(USERS)
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!profile) return res.status(404).send('Profile not found');
  res.render('profile', {
    profile,
    editing:    req.query.edit === 'true',
    userId:     req.session.userId,
    activePage: 'profile'
  });
});

// Verwerk update + foto‐upload
app.post(
  '/profile/:id',
  requireLogin,
  upload.single('photo'),
  async (req, res) => {
    const id = req.params.id;
    const tags      = (req.body.tags     || '').split(',').map(t => t.trim()).filter(Boolean);
    const languages = (req.body.languages|| '').split(',').map(l => l.trim()).filter(Boolean);

    const upd = {
      name:      req.body.name,
      location:  req.body.location,
      tags,
      languages,
      bio:       req.body.bio
    };
    if (req.file) upd.photoUrl = '/uploads/' + req.file.filename;

    await db.collection(USERS)
      .updateOne({ _id: new ObjectId(id) }, { $set: upd });

    res.redirect('/profile/' + id);
  }
);
// (alleen voor testen, daarna kun je dit weghalen)
app.get('/create-test-profile', async (req, res) => {
  const newUser = {
    name: 'Testgebruiker',
    location: 'Amsterdam',
    tags: ['Test','Demo'],
    languages: ['Nederlands','English'],
    bio: 'Dit is een testprofiel',
  };
  const result = await db.collection(USERS).insertOne(newUser);
  res.send(`Testprofiel aangemaakt met ID: ${result.insertedId}`);
});


// ─── MORE‐MEETS (example) ────────────────────────────────────────────────
app.get('/more-meets', requireLogin, (req, res) => {
  res.render('more-meets');
});

// ─── 404 ────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).send('Niet gevonden'));

// ─── START SERVER ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server draait op poort ${PORT}`));
