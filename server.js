// server.js
const express               = require('express');
const path                  = require('path');
const session               = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt                = require('bcryptjs');
const multer                = require('multer');
require('dotenv').config();

const app = express();

// Body parser, static files & sessions
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// MongoDB
const client = new MongoClient(process.env.URI);
let db;
client.connect()
  .then(() => {
    db = client.db(process.env.DB_NAME);
    console.log('✅ Database connected');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// Middleware: protect routes
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Helper: compare plaintext to hashed data
async function compareData(plainText, hashed) {
  try {
    return await bcrypt.compare(plainText, hashed);
  } catch (err) {
    console.error('Error comparing data:', err);
    throw err;
  }
}


// ─── AUTH: Register & Login ────────────────────────────────────────────

// Show registration form
app.get('/register', (req, res) => {
  res.render('register', { errors: [] });
});

// Handle registration
app.post('/register', async (req, res) => {
  const { email, name, password } = req.body;
  const errors = [];

  if (!email || !name || !password) {
    errors.push({ msg: 'Please fill in all fields' });
  }
  if (errors.length) {
    return res.render('register', { errors });
  }

  const hash   = await bcrypt.hash(password, 10);
  const result = await db.collection(process.env.USER_COLLECTION).insertOne({
    email,
    name,
    password: hash
  });

  // Log the user in
  req.session.userId = result.insertedId;
  res.redirect('/home');
});

// Show login form
app.get('/login', (req, res) => {
  res.render('login', { errors: [], formData: {} });
});

// Handle login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      errors: [{ msg: 'Please provide your email and password' }],
      formData: { email }
    });
  }

  try {
    const user = await db.collection(process.env.USER_COLLECTION).findOne({ email });
    if (!user) {
      return res.render('login', {
        errors: [{ msg: 'Invalid email or password' }],
        formData: { email }
      });
    }

    const isMatch = await compareData(password, user.password);
    if (!isMatch) {
      return res.render('login', {
        errors: [{ msg: 'Invalid email or password' }],
        formData: { email }
      });
    }

    // Log the user in
    req.session.userId = user._id;
    res.redirect('/home');
  } catch (error) {
    console.error('Error processing login:', error);
    res.status(500).render('login', {
      errors: [{ msg: 'Server error, please try again later.' }],
      formData: { email }
    });
  }
});


app.get('/loginHome', (req, res) => {
  res.render('loginHome.ejs');
});
// ─── HOMEPAGE ────────────────────────────────────────────────────────────

// Redirect root to /home
app.get('/', (req, res) => {
  return res.redirect('/home');
});

// Protected homepage
app.get('/home', requireLogin, async (req, res) => {
  try {
    // Fetch all meets from MongoDB
const meets = await db.collection('meets').find({}).toArray();
res.render('home', {
  meets,
  userId: req.session.userId
});
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).send('Error fetching meetings');
  }
});


// ─── PROFILE & UPLOADS ───────────────────────────────────────────────────

// Multer storage configuration
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
      : cb(new Error('Only image files are allowed'))
});

// View profile (add ?edit=true to edit)
app.get('/profile/:id', requireLogin, async (req, res) => {
  try {
    const profile = await db.collection(process.env.USER_COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!profile) {
      return res.status(404).send('Profile not found');
    }

    res.render('profile', {
      profile,
      editing:    req.query.edit === 'true',
      userId:     req.session.userId,
      activePage: 'profile'
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Error loading profile');
  }
});

// Handle profile update & photo upload
app.post(
  '/profile/:id',
  requireLogin,
  upload.single('photo'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const tags      = (req.body.tags     || '').split(',').map(t => t.trim()).filter(Boolean);
      const languages = (req.body.languages|| '').split(',').map(l => l.trim()).filter(Boolean);

      const updateData = {
        name:      req.body.name,
        location:  req.body.location,
        tags,
        languages,
        bio:       req.body.bio
      };
      if (req.file) {
        updateData.photoUrl = '/uploads/' + req.file.filename;
      }

      await db.collection(process.env.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      res.redirect('/profile/' + id);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Error updating profile');
    }
  }
);

// (Optional) Test endpoint to create a profile
app.get('/create-test-profile', async (req, res) => {
  const testUser = {
    name: 'Test User',
    location: 'Amsterdam',
    tags: ['Test','Demo'],
    languages: ['Dutch','English'],
    bio: 'This is a test profile'
  };
  const result = await db.collection(process.env.USER_COLLECTION).insertOne(testUser);
  res.send(`Test profile created with ID: ${result.insertedId}`);
});


// ─── MORE MEETS ─────────────────────────────────────────────────────────
app.get('/more-meets', requireLogin, (req, res) => {
  res.render('more-meets');
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    // optioneel: foutafhandeling
    res.redirect('/login');
  });
});

// ─── 404 & START SERVER ─────────────────────────────────────────────────
// 404 handler
app.use((_, res) => res.status(404).send('Not Found'));

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

