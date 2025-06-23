const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { ObjectId } = require("mongodb");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../static/images"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// GET: Render create meet form
router.get("/create-meet", (req, res) => {
  res.render("create-meet", {
    userId: req.session.userId || null,
    user: req.session.user || null,
  });
});

// POST: Handle meet creation
router.post("/create-meet", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.render("create-meet", {
      error: "You must upload a cover image to create a meet.",
      userId: req.session.userId || null,
      user: req.session.user || null,
    });
  }
  // Save the meet to the database
  const db =
    req.app.locals.db ||
    require("mongodb")
      .MongoClient.connect(process.env.URI)
      .then((client) => client.db(process.env.DB_NAME));
  const meet = {
    meetingName: req.body.title, // match field in EJS and other code
    description: req.body.description,
    maxPeople: parseInt(req.body.maxPeople, 10),
    date: req.body.date,
    time: req.body.time,
    location: req.body.location,
    category: req.body.category,
    image: "/static/images/" + req.file.filename,
    members: [],
    creatorId: req.session.userId ? req.session.userId.toString() : null,
    createdAt: new Date(),
  };
  const dbInstance = await db;
  await dbInstance.collection("meets").insertOne(meet);
  res.redirect("/meets");
});

// GET: Render edit meet form
router.get("/edit-meet/:id", async (req, res) => {
  const db =
    req.app.locals.db ||
    require("mongodb")
      .MongoClient.connect(process.env.URI)
      .then((client) => client.db(process.env.DB_NAME));
  const dbInstance = await db;
  const meet = await dbInstance.collection("meets").findOne({ _id: new ObjectId(req.params.id) });
  if (!meet) {
    return res.status(404).send("Meet not found");
  }
  // Only allow the creator to edit
  if (!req.session.userId || String(meet.creatorId) !== String(req.session.userId)) {
    return res.status(403).send("Unauthorized");
  }
  res.render("edit-meet", {
    meet,
    userId: req.session.userId || null,
    user: req.session.user || null,
    error: null
  });
});

// POST: Handle meet update
router.post("/edit-meet/:id", upload.single("image"), async (req, res) => {
  const db =
    req.app.locals.db ||
    require("mongodb")
      .MongoClient.connect(process.env.URI)
      .then((client) => client.db(process.env.DB_NAME));
  const dbInstance = await db;
  const meet = await dbInstance.collection("meets").findOne({ _id: new ObjectId(req.params.id) });
  if (!meet) {
    return res.status(404).send("Meet not found");
  }
  if (!req.session.userId || String(meet.creatorId) !== String(req.session.userId)) {
    return res.status(403).send("Unauthorized");
  }
  // Build update object
  const update = {
    meetingName: req.body.title,
    description: req.body.description,
    maxPeople: parseInt(req.body.maxPeople, 10),
    date: req.body.date,
    time: req.body.time,
    location: req.body.location,
    category: req.body.category,
    address: req.body.address || '',
  };
  if (req.file) {
    update.image = "/static/images/" + req.file.filename;
  }
  await dbInstance.collection("meets").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update }
  );
  res.redirect("/meet-overview/" + req.params.id);
});

module.exports = router;
