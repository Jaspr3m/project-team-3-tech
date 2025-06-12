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

// Multer for profile photos
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'static/uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 2*1024*1024 },
  fileFilter: (_, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only images allowed'))
});

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
  if (!email || !password) {
    return res.render('login', { errors: [{ msg: 'Vul zowel e-mail als wachtwoord in' }] });
  }
  const user = await db.collection(USERS).findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { errors: [{ msg: 'Onjuist e-mail of wachtwoord' }] });
  }
  req.session.userId = user._id.toString();
  res.redirect('/homepage');
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
app.get('/create-test-profile', async (req, res) => {
  const newUser = {
    name: 'Ivy',
    location: 'Amsterdam',
    tags: ['Hiking','Coffee'],
    languages: ['Dutch','English'],
    bio: 'Backpacking across Europe…'
  };
  const result = await db.collection(USERS).insertOne(newUser);
  res.send(`Test profiel gemaakt met ID: ${result.insertedId}`);
});

// ─── PROFILE: view, edit & upload ────────────────────────────────────────
app.get('/profile/:id', requireLogin, async (req, res) => {
  const profile = await db.collection(USERS)
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!profile) return res.status(404).send('Profile not found');
  const editing = req.query.edit === 'true';
  res.render('profile', {
    profile,
    editing,
    userId: req.session.userId,
    activePage: 'profile'
  });
});

app.post('/profile/:id',
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

// ─── MORE‐MEETS (example) ────────────────────────────────────────────────
app.get('/more-meets', requireLogin, (req, res) => {
  res.render('more-meets');
});

// ─── 404 ────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).send('Niet gevonden'));

// ─── START SERVER ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server draait op poort ${PORT}`));
