const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const morgan = require("morgan");
const bcrypt = require("bcrypt");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(morgan("dev"));
app.use(cookieSession({
  name: 'session',
  keys: ["key1", "key2"]
}));

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "uOgi6A" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "uOgi6A" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "testUser": {
    id: "uOgi6A",
    email: "testusername@gmail.com",
    password: "12345"
  }
};

const { generateRandomString, updateURL, checkUserEmailExists, urlsForUser, belongsToUser, getUserByEmail } = require("./helpers");

const showErrorPage = function(req, res, errorNo, errorMsg) {
  let user = users[req.session.user_id];
  let templateVars = {errorNo, errorMsg, user}
  res.status(errorNo).render("error", templateVars)
}

// HOME PAGE, doesn't do anything
app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// INDEX PAGE, shows listing of URLs
app.get("/urls", (req, res) => {
  let user = users[req.session.user_id];
  if (!req.session.user_id) {
    res.redirect("/login");
    return;
  }
  let filteredUrlDatabase = urlsForUser(user.id, urlDatabase);
  let templateVars = { urls: filteredUrlDatabase, user };
  res.render("urls_index", templateVars);
});

// CREATES NEW SHORTENED URL
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  let user = users[req.session.user_id];
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: user.id };
  res.redirect(`/urls/${shortURL}`);
});

// REGISTRATION PAGE
app.get("/register", (req, res) => {
  let user = users[req.session.user_id];
  if (user) {
    res.redirect("/urls");
    return;
  }
  let templateVars = { user };
  res.render("register", templateVars);
});

// POST TO REGISTER
app.post("/register", (req, res) => {
  let userID = generateRandomString();
  if (!req.body.email || !req.body.password) {
    showErrorPage(req, res, 400, "Please input both an email and a password.")
    return;
  }
  if (checkUserEmailExists(req.body.email, users)) {
    showErrorPage(req, res, 400, "This email is already taken.")
    return;
  }
  let hashedPassword = bcrypt.hashSync(req.body.password, 10);
  users[userID] = { id: userID, email: req.body.email, password: hashedPassword };
  req.session.user_id = userID;
  res.redirect("/urls");
});

// LOGIN PAGE - SHOWS PAGE
app.get("/login", (req, res) => {
  let user = users[req.session.user_id];
  if (user) {
    res.redirect("/urls");
    return;
  }
  let templateVars = { user };
  res.render("login", templateVars);
});

// LOGIN - ACCEPTS FORM
app.post("/login", (req, res) => {
  let emailInput = req.body.email;
  let passwordInput = req.body.password;
  if (!checkUserEmailExists(emailInput, users)) {
    showErrorPage(req, res, 403, "This account cannot be found.")
    return;
  } else {
    let user_id = getUserByEmail(emailInput, users);
    if (bcrypt.compareSync(passwordInput, users[user_id].password)) {
      req.session.user_id = user_id;
      res.redirect("/urls");
    } else {
      showErrorPage(req, res, 403, "Password does not match.")
      return;
    }
  }
});

// SHOWS NEW URL PAGE
app.get("/urls/new", (req, res) => {
  let user = users[req.session.user_id];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let templateVars = { user };
  res.render("urls_new", templateVars);
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/urls");
});

// SHOWS INDIVIDUAL URL PAGE
app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let user = users[req.session.user_id];
  if (!user) {
    res.redirect("/login");
    return;
  }
  if (!belongsToUser(user.id, shortURL, urlDatabase)) {
    showErrorPage(req, res, 401, "This tinyURL does not exist, or you're not authorised to view it.")
    return;
  }
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[shortURL].longURL, user };
  res.render("urls_show", templateVars);
});

// UPDATES LONG URL IN DATABASE
app.post("/urls/:shortURL", (req, res) => {
  let user = users[req.session.user_id];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let shortURL = req.params.shortURL;
  let longURL = req.body.longURL;
  updateURL(shortURL, longURL, urlDatabase);
  res.redirect("/urls");
});

// REDIRECTS TO LONG URL, adds https if needed
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) {
    showErrorPage(req, res, 401, "This tinyURL doesn't exist yet. Make one by logging in or registering.")
    return;
  }
  let longURL = urlDatabase[shortURL].longURL;
  if (!longURL.startsWith("http")) {
    longURL = "https://" + longURL;
  }
  res.redirect(longURL);
});

// DELETES URL FROM DATABASE
app.post("/urls/:shortURL/delete", (req, res) => {
  let user = users[req.session.user_id];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Susan's tinyapp listening on port ${PORT}!`);
});