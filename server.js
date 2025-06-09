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
  try {
    const meet = await db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) return res.status(404).send("Meet not found");
    // For now, isMember and userId are placeholders
    res.render("meet-overview", { meet, isMember: false, userId: null });
  } catch (error) {
    console.error("Error fetching meet:", error);
    res.status(500).send("Fout bij het ophalen van meet");
  }
});

// Simulate a logged-in user (replace with real session logic later)
const getCurrentUserId = (req) => {
  // For demo, use a hardcoded userId
  return "demoUserId";
};

// Join a meet
app.post("/meet/:id/join", async (req, res) => {
  const userId = getCurrentUserId(req);
  try {
    await db
      .collection("meets")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $addToSet: { members: userId } }
      );
    res.redirect("/meet/" + req.params.id);
  } catch (error) {
    console.error("Error joining meet:", error);
    res.status(500).send("Fout bij het joinen van meet");
  }
});

// Leave a meet
app.post("/meet/:id/cancel", async (req, res) => {
  const userId = getCurrentUserId(req);
  try {
    await db
      .collection("meets")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $pull: { members: userId } }
      );
    res.redirect("/meet/" + req.params.id);
  } catch (error) {
    console.error("Error leaving meet:", error);
    res.status(500).send("Fout bij het verlaten van meet");
  }
});

// Single meet overview (update to show join/cancel button)
app.get("/meet/:id", async (req, res) => {
  try {
    const meet = await db
      .collection("meets")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!meet) return res.status(404).send("Meet not found");
    const userId = getCurrentUserId(req);
    const isMember =
      Array.isArray(meet.members) && meet.members.includes(userId);
    res.render("meet-overview", { meet, isMember, userId });
  } catch (error) {
    console.error("Error fetching meet:", error);
    res.status(500).send("Fout bij het ophalen van meet");
  }
});

// All users overview
app.get("/users", async (req, res) => {
  try {
    // Example: only show users with a 'voornaam' property
    const users = await db
      .collection("users")
      .find({ voornaam: { $exists: true } })
      .toArray();
    res.render("users", { users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Fout bij het ophalen van users");
  }
});

app.get("/meets", async (req, res) => {
  const meets = await db.collection("meets").find().toArray();
  res.render("meets", { meets });
});
