// server.js
const express       = require('express');
const path          = require('path');
const session       = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt        = require('bcryptjs');
const multer        = require('multer');
require('dotenv').config();

const app = express();

// ────────────────────────────────────────────────────────────────────────────
//  Bodyparser, statics & sessions
// ────────────────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use('/static',  express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'static/uploads')));
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 }
}));

// ────────────────────────────────────────────────────────────────────────────
//  View‐engine
// ────────────────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// ────────────────────────────────────────────────────────────────────────────
//  MongoDB connect
// ────────────────────────────────────────────────────────────────────────────
const client = new MongoClient(process.env.URI);
const db     = client.db(process.env.DB_NAME);
const USERS  = process.env.USER_COLLECTION;
client.connect().then(() => console.log('✅ DB connected'));


// ────────────────────────────────────────────────────────────────────────────
//  login verplicht
// ────────────────────────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// ────────────────────────────────────────────────────────────────────────────
//  AUTH: register & login (ongetouched)
// ────────────────────────────────────────────────────────────────────────────
app.get ('/register', (req, res) => res.render('register', { errors: [] }));
app.post('/register', async (req, res) => {
  const { email,name,password } = req.body;
  const errors = [];
  if (!email||!name||!password) errors.push({ msg: 'Vul alle velden in' });
  if (errors.length) return res.render('register', { errors });
  const hash = await bcrypt.hash(password, 10);
  await db.collection(USERS).insertOne({ email,name,password:hash });
  res.redirect('/login');
});

app.get ('/login', (req, res) => res.render('login', { errors: [] }));
app.post('/login', async (req, res) => {
  const { email,password } = req.body;
  const user = await db.collection(USERS).findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { errors:[{ msg:'Onjuist e-mail of wachtwoord'}] });
  }
  req.session.userId = user._id.toString();
  res.redirect('/homepage');
});

// ────────────────────────────────────────────────────────────────────────────
//  HOMEPAGE (dummy, ongewijzigd)
// ────────────────────────────────────────────────────────────────────────────
app.get('/homepage', requireLogin, (req, res) => {
  // sample data until you hook it up to Mongo
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
    }
  ];
  res.render('homepage', {
    userId: req.session.userId,
    meetings
  });
});

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

// ────────────────────────────────────────────────────────────────────────────
//  PARTIALS & 404
// ────────────────────────────────────────────────────────────────────────────
app.use((_,res) => res.status(404).send('Niet gevonden'));

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server draait op poort ${process.env.PORT}`)
);
