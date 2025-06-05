const express = require("express");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
app.use(express.urlencoded({ extended: true }));

require("dotenv").config();

// Set view engine + views + static files
app.use("/static", express.static("static"));
app.set("view engine", "ejs");
app.set("views", "views");
app.listen(3000);
console.log("Server listening @ localhost:3000!");

// Reveal rootpage with onhome() function
app.get("/", async (req, res) => {
  // Find first 3 meets from the 'meets' collection
  const meets = await db
    .collection("meets")
    .find({})
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();
  res.render("homepage.ejs", { meets });
});

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
