const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
app.use(express.urlencoded({ extended: true }));

require("dotenv").config();

const multer = require('multer');



app
 .use('/static', express.static('static'))

 .set('view engine', 'ejs')
 .set('views', 'view')

    .get('/songList', song)
    .get('/', onhome)
    .get('/about', onabout)
    .get('/register', showRegister)
    .get('/login', showLogin)
    .get('/loginHome', showLoginHome)
 .get('/home', homepage)
   


    .listen(8000)

app
  .get('/more-meets', (req, res) => {
        res.render('more-meets');
      });


app
    .post('/form', verwerkformulier)

    function showLoginHome(req, res) {
        res.render('loginHome.ejs');
    }

    //login scherm
app.post('/register', 
    async (req, res) => {
    const result = validationResult(req);
    console.log("result validation", result);

    if (result.isEmpty()) {
        const { email, name, password } = req.body;
        console.log('form data:', req.body);

        if (!email || !name || !password) {
            return res.status(400).render('register.ejs', {
                errors: [{ msg: 'Vul alle verplichte velden in: e-mail, naam en wachtwoord' }]
            });
        }

        try {
            const hashedPassword = await hashData(password);
            const user = { email, name, password: hashedPassword };

            if (!db) {
                console.error('Database not initialized');
                return res.status(500).render('register.ejs', {
                    errors: [{ msg: 'Serverfout: database niet geïnitialiseerd' }]
                });
            }

            const insertResult = await db.collection('users').insertOne(user);
            console.log('Inserted user:', insertResult.insertedId);
            return res.redirect('/login');
        } catch (error) {
            console.error('Error processing form:', error);
            return res.status(500).render('register.ejs', {
                errors: [{ msg: 'Fout bij het registreren: probeer het later opnieuw' }]
            });
        }
    } else {
        const errors = result.array();
        console.log('Validation errors:', errors);
        return res.render('register.ejs', { errors });
    }
});

function showRegister(req, res) {
    res.render('register.ejs', { errors: [] });
}










// Compare given and stored data (unchanged)
async function compareData(plainTextData, hashedData) {
  try {
    const match = await bcrypt.compare(plainTextData, hashedData);
    return match;
  } catch (error) {
    console.error('Error comparing data:', error);
    throw error;
  }
}


 .listen(8000)


    const { email, password } = req.body;
    console.log('login form data:', req.body);

    try {
        // Zoek de gebruiker in de database
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            // Gebruiker niet gevonden
            return res.render('login.ejs', {
                errors: [{ msg: 'Ongeldig e-mailadres of wachtwoord' }]
            });
        }

        // Vergelijk het ingevoerde wachtwoord met de opgeslagen hash
        const isMatch = await compareData(password, user.password);
        if (!isMatch) {
            // Wachtwoord komt niet overeen
            return res.render('login.ejs', {
                errors: [{ msg: 'Ongeldig e-mailadres of wachtwoord' }]
            });
        }

        // Succesvolle login, redirect naar een dashboard of stuur een succesmelding
        // TODO: Voeg sessiebeheer toe als je de ingelogde status wilt bijhouden
        return res.redirect('/dashboard'); // Of: res.send('Succesvol ingelogd!');
    } catch (error) {
        console.error('Error processing login:', error);
        return res.status(500).render('login.ejs', {
            errors: [{ msg: 'Fout bij het inloggen: probeer het later opnieuw' }]
        });
    }
});










//home screen// 
function onhome(req, res) {
    res.send('<h1>Hello World!</h1> <img src="/static/images/snoopy.jpg" alt="Poster" width="50%"/>')
}

function onabout(req, res) {
    res.send(`<h1>About me!</h1> <img src="/static/images/postermockup.png" alt="Poster" width="50%"/>`)
} 


function song(req, res, ) {
    let song = {
        title: 'FAMJAM400',
        description: 'You watched me grow up from a...'
    }
    
    res.render('detail.ejs', {data: song})
}



// Mongo configuratie uit .env bestand
const uri = process.env.URI;

// nieuwe MongoDB client
const client = new MongoClient(uri);
const db = client.db(process.env.DB_NAME);
const collection = process.env.USER_COLLECTION;

async function connectDB() {
  try {
    await client.connect();
    console.log("Client connected to database");
  } catch (error) {
    console.log(error);
  }
}

connectDB();

app.get("/profile/:id", async (req, res) => {
  const profile = await db
    .collection(collection)
    .findOne({ _id: new ObjectId(req.params.id) });

  const editing = req.query.edit === "true";

  res.render("profile", { profile: profile, editing: editing });
});

app.post("/profile/:id", async (req, res) => {
  const updatedProfile = {
    name: req.body.name,
    location: req.body.location,
    tags: req.body.tags,
    languages: req.body.languages,
    bio: req.body.bio,
  };

  await db
    .collection(collection)
    .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updatedProfile });

  res.redirect("/profile/" + req.params.id);
});

const userRouter = require("./routes/user");
app.use("/user", userRouter);

app.get("/users", async (req, res) => {
  const users = await db.collection(collection).find().toArray();
  res.render("users.ejs", { users });
});

app.get("/user/create-meet", (req, res) => {
  res.render("create-meet.ejs");
});

app.post("/user/create-meet", async (req, res) => {
  const { meetingName, location, description, maxPeople } = req.body;
  const meet = {
    meetingName,
    location,
    description,
    maxPeople: maxPeople ? parseInt(maxPeople) : null,
    users: [],
    createdAt: new Date(),
  };
  const result = await db.collection("meets").insertOne(meet);
  res.send(
    `<script>alert('Meet created! Data: ${JSON.stringify(
      meet
    )}'); window.location.href = '/';</script>`
  );
});

app.get("/meet/:id", async (req, res) => {
  const meet = await db
    .collection("meets")
    .findOne({ _id: new ObjectId(req.params.id) });
  const userId = req.query.userId || null; // Get userId from query if present
  const isMember = meet.users && userId && meet.users.includes(userId);
  res.render("meet-overview.ejs", { meet, isMember, userId });
});

app.post("/meet/:id/join", async (req, res) => {
  const userId = req.body.userId;
  await db
    .collection("meets")
    .updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { users: userId } }
    );
  res.send(
    `<script>alert('You joined the meet!'); window.location.href = '/meet/${req.params.id}?userId=${userId}';</script>`
  );
});

app.post("/meet/:id/cancel", async (req, res) => {
  const userId = req.body.userId;
  await db
    .collection("meets")
    .updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { users: userId } }
    );
  res.send(
    `<script>alert('You left the meet.'); window.location.href = '/meet/${req.params.id}';</script>`
  );
});

app.get("/meets", async (req, res) => {
  const meets = await db.collection("meets").find().toArray();
  res.render("meets", { meets });
});
