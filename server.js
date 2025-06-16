// server.js
const express               = require('express');
const path                  = require('path');
const session               = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt                = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const multer                = require('multer');
// const xss = require('xss');
require('dotenv').config();

const app = express();
const saltRounds = 10

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
    console.error('Error comparing data:', err);
    throw err;
  }
}


// ─── AUTH: Register & Login ────────────────────────────────────────────

// Show registration form
app.get('/register', (req, res) => {
  res.render('register', {
    errors: [],
    formData: { email: '', name: '' }
  });
});

app.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Fill in a valid E-mail adress'),
    body('name')
      .notEmpty()
      .withMessage('Fill in your name'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must contain at least 6 charachters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { email, name, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('register', {
        errors: errors.array(),
        formData: { email, name, password }
      });
    }

    try {
      const hashedPassword = await hashData(password);
      const user = { email, name, password: hashedPassword };
      const insertResult = await db.collection('users').insertOne(user);
      console.log('Inserted user:', insertResult.insertedId);
      return res.redirect('/home');
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).render('register', {
        errors: [{ msg: 'Something went wrong with registering your account' }],
        formData: { email, name, password }
      });
    }
  }
);


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
      formData: { email, password }
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

 function showRegister(req, res) {
    res.render('register.ejs', { errors: [] });
  }

  function showLogin(req, res) {
    res.render('login.ejs', { errors: [] });
  }

  function showLoginHome(req, res) {
    res.render('loginHome.ejs', { errors: [] });
  }


// ─── HOMEPAGE ────────────────────────────────────────────────────────────

// Redirect root to /home
app.get('/', (req, res) => {
  return res.redirect('/home');
});

// Protected homepage
app.get('/home',  async (req, res) => {
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
app.get('/profile/:id',  async (req, res) => {
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
app.get('/more-meets', (req, res) => {
  res.render('more-meets');
});


// ─── 404 & START SERVER ─────────────────────────────────────────────────
// 404 handler
app.use((_, res) => res.status(404).send('Not Found'));

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
