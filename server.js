const express = require('express')
const app = express()
const xss = require('xss')
const html = xss('<script>alert("xss");</script>');
console.log(html);
const bcrypt = require('bcryptjs');
const saltRounds = 10
const {query, body, validationResult } = require('express-validator') 



app.use(express.urlencoded({ extended: true }))

require("dotenv").config();

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
   


    .listen(8000)

    //loginHome scherm

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








// Password hashing function
async function hashData(data) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedData = await bcrypt.hash(data, salt);
    return hashedData;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error; // Rethrow to be caught in the calling function
  }
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



//login scherm
function showLogin(req, res) {
    res.render('login.ejs', { errors: [] });
}

app.post('/login', [
    body('email').isEmail().withMessage('Voer een geldig e-mailadres'),
    body('password').notEmpty().withMessage('Wachtwoord is verplicht')
], async (req, res) => {
    const result = validationResult(req);
    console.log("login validation result", result);

    if (!result.isEmpty()) {
        // Validatiefouten, toon het inlogformulier met foutmeldingen
        const errors = result.array();
        console.log('Validation errors:', errors);
        return res.render('login.ejs', { errors });
    }

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


function song(req, res,) {
    let song = {
        title: 'FAMJAM400',
        description: 'You watched me grow up from a...'
    }

    res.render('detail.ejs', { data: song })
}


//mongo db

const { MongoClient, ObjectId } = require("mongodb");

// Mongo configuratie uit .env bestand 
const uri = process.env.URI;

// nieuwe MongoDB client 
const client = new MongoClient(uri);
const db = client.db(process.env.DB_NAME);
const collection = process.env.USER_COLLECTION;


async function connectDB() {
    try {
        await client.connect()
        console.log("Client connected to database");
    }
    catch (error) {
        console.log(error);
    }
}

connectDB();















