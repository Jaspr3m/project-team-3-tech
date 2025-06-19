const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

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

module.exports = router;
