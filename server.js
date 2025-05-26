const express = require('express')
const app = express()
const xss = require('xss')
const html = xss('<script>alert("xss");</script>');
console.log(html);
const bcrypt = require('bcryptjs');
const saltRounds = 10;



app.use(express.urlencoded({ extended: true }))

require("dotenv").config();

app
    .use('/static', express.static('static'))

    .set('view engine', 'ejs')
    .set('views', 'view')

    .get('/songList', song)
    .get('/', onhome)
    .get('/about', onabout)
    .get('/formulier', toonformulier)
    .get('/users', showUsers)

    .listen(8000)
    console.log("Server listening @ localhost:8000!")

app
    .post('/form', verwerkformulier)

function toonformulier(req, res) {
    res.render('form.ejs')
}
// function verwerkformulier(req, res) {


//     res.send('test')
//     console.log(req.body)


//     bcrypt.genSalt(saltRounds, function(err, salt) {
//     bcrypt.hash(req.body.password, salt, function(err, hash) {
//         db.collection('users').insertOne(hash)
//     });
// });

// }

async function verwerkformulier(req, res) {
    const { name, sirname, password } = req.body

    console.log('form data:', req.body);

    if (!name || !sirname || !password) {
        return res.status(400).send('Missing required fields: name, sirname, or password');
    }

    try {
        // Hash the password using your hashData function
        const hashedPassword = await hashData(password);

        // Create a user document
        const user = {
            name,
            surname: sirname, // Match the field name in your form
            password: hashedPassword,
        };

        // Insert the user document into MongoDB
        const result = await db.collection('users').insertOne(user);

        // Send success response
        res.send('User registered successfully!');
        console.log('Inserted user:', result.insertedId);
    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).send('Error registering user');
    }
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

async function showUsers(req, res) {
    try {
        // Find users with a 'voornaam' field (not null/undefined/empty)
        const users = await db.collection('users').find({ voornaam: { $exists: true, $ne: '' } }).project({ _id: 1, voornaam: 1 }).toArray();
        res.render('users.ejs', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
}

// Database connectie
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
        console.log("Client has connected to TravelLink database!");
    }
    catch (error) {
        console.log(error);
    }
}

connectDB();















