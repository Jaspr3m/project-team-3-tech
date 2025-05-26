const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require("mongodb");
app.use(express.urlencoded({ extended: true }))

require("dotenv").config(); 

app
 .use('/static', express.static('static'))

 .set('view engine', 'ejs')
 .set('views', 'views')

 .get('/songList', song)

 .get('/', onhome)
 .get('/about', onabout)

 .listen(8000)

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
        await client.connect()
        console.log("Client connected to database");
    }
    catch (error) {
        console.log(error);
    }
}

connectDB()


app.get('/create-test-profile', async (req, res) => {
    const userCollection = db.collection(collection);
  
    const newUser = {
      name: "Ivy",
      location: "Amsterdam",
      tags: ["Hiking", "Coffee"],
      languages: ["Dutch", "English"], 
      bio: "Backpacking across Europe | Love local cafe’s, beach walks and other stuff!"
    };
  
    const result = await userCollection.insertOne(newUser);
    res.send("Testprofiel gemaakt met ID: " + result.insertedId);
  });

  app.get('/profile/:id', async (req, res) => {
    const profile = await db.collection(collection).findOne({ _id: new ObjectId(req.params.id) });
  
    const editing = req.query.edit === 'true';
  
    res.render('profile', { profile: profile, editing: editing });
  });

  app.post('/profile/:id', async (req, res) => {
    const updatedProfile = {
      name: req.body.name,
      location: req.body.location,
      tags: req.body.tags,
      languages: req.body.languages,
      bio: req.body.bio
    };
  
    await db.collection(collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedProfile }
    );
  
    res.redirect("/profile/" + req.params.id);
  });
  






















