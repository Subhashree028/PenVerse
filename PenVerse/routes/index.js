var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require("passport");
const upload = require("./multer");
const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index");
});
router.get("/login", function (req, res, next) {
  res.render("login", { error: req.flash("error") });
});
router.get("/feed", function (req, res, next) {
  res.render("feed");
});

router.post(
  "/upload",
  isLoggedIn,
  upload.single("file"),
  async function (req, res, next) {
    if (!req.file) {
      return res.status(400).send("No files were uploaded.");
    }
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postModel.create({
      image: req.file.filename,
      imageText: req.body.filecaption,
      user: user._id,
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
  }
);
// router.get("/profile", isLoggedIn, async function (req, res, next) {
//   const user = await userModel.findOne({
//     username: req.session.passport.user,
//   });
//   console.log(user);
//   res.render("profile");
// });
router.get("/profile", isLoggedIn, async function (req, res, next) {
  try {
    const user = await userModel
      .findOne({
        username: req.session.passport.user,
      })
      .populate("posts");
    console.log(user);
    if (!user) {
      return res.redirect("/login"); // Handle case where user is not found
    }

    console.log(user); // Debugging: Check if user is found

    res.render("profile", { user: user }); // ✅ Pass user object to EJS
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});
router.post(
  "/uploadProfile",
  isLoggedIn,
  upload.single("image"), // Middleware for handling file uploads
  async function (req, res, next) {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    try {
      const user = await userModel.findOne({ username: req.session.passport.user });

      if (!user) {
        return res.redirect("/login");
      }

      user.dp = req.file.filename; // Update the profile picture
      await user.save(); // Save the updated user data

      res.redirect("/profile"); // Redirect back to profile after upload
    } catch (err) {
      console.error(err);
      res.status(500).send("Error updating profile picture.");
    }
  }
);

router.post("/register", function (req, res) {
  const userData = new userModel({
    username: req.body.username,
    email: req.body.email,
    fullname: req.body.fullname,
  });
  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {}
);
router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}
module.exports = router;
