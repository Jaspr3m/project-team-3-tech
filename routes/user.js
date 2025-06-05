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
  res.render("create-meet");
});

// POST: Handle meet creation
router.post("/create-meet", upload.single("image"), async (req, res) => {
  // Save the meet to the database
  const db =
    req.app.locals.db ||
    require("mongodb")
      .MongoClient.connect(process.env.URI)
      .then((client) => client.db(process.env.DB_NAME));
  const meet = {
    meetingName: req.body.meetingName,
    location: req.body.location,
    description: req.body.description,
    maxPeople: req.body.maxPeople,
    image: req.file ? "/static/images/" + req.file.filename : null,
  };
  const dbInstance = await db;
  await dbInstance.collection("meets").insertOne(meet);
  res.send(
    `<script>alert('Meet created! Data: ${JSON.stringify(
      meet
    )}'); window.location.href = '/';</script>`
  );
});

module.exports = router;
