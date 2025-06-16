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
    });
  }
  // Save the meet to the database
  const db = req.app.locals.db;
  const meet = {
    title: req.body.title,
    maxPeople: req.body.maxPeople,
    duration: req.body.duration,
    date: req.body.date,
    time: req.body.time,
    address: req.body.address,
    image: "/static/images/" + req.file.filename,
    members: [],
  };
  await db.collection("meets").insertOne(meet);
  res.send(
    `<script>alert('Meet created! Data: ${JSON.stringify(
      meet
    )}'); window.location.href = '/';</script>`
  );
});

module.exports = router;
