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

const generateRandomString = function () {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  } return result;
};

const updateURL = (shortURL, longURL) => {
  urlDatabase[shortURL].longURL = longURL;
};

const checkUserEmailExists = function (email) {
  return Object.values(users).some(element => element.email === email);
};

const lookupUserId = function (emailLookup) {
  return Object.values(users).find(user => user.email === emailLookup).id
};

const urlsForUser = function (id) {
  let matchingKeys = [], userFilteredUrlDatabase = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      matchingKeys.push(url);
    }
  }
  matchingKeys.forEach(key => {
    userFilteredUrlDatabase[key] = urlDatabase[key];
  });
  return userFilteredUrlDatabase;
}

const belongsToUser = function (id, shortURL) {
  let usersUrls = urlsForUser(id); let found = false;
  Object.keys(usersUrls).forEach(url => {
    if (url === shortURL) {
      found = true;
    }
  }); return found;
}

// HOME PAGE, doesn't do anything
app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// INDEX PAGE, shows listing of URLs
app.get("/urls", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  if (!req.session.user_id) {
    res.redirect("/login");
    return;
  }
  let filteredUrlDatabase = urlsForUser(user.id);
  let templateVars = { urls: filteredUrlDatabase, user };
  res.render("urls_index", templateVars);
});

// CREATES NEW SHORTENED URL
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: user.id };
  res.redirect(`/urls/${shortURL}`);
});

// REGISTRATION PAGE
app.get("/register", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  let templateVars = { user };
  res.render("register", templateVars);
});

// POST TO REGISTER
app.post("/register", (req, res) => {
  let userID = generateRandomString();
  if (!req.body.email || !req.body.password) {
    res.status(400).send("Please input both an email and a password.");
    return;
  }
  if (checkUserEmailExists(req.body.email)) {
    res.status(400).send("This email is already taken.");
    return;
  }
  let hashedPassword = bcrypt.hashSync(req.body.password, 10);
  users[userID] = { id: userID, email: req.body.email, password: hashedPassword };
  req.session.user_id = userID; // COOKIE OVER HERE
  res.redirect("/urls");
});

// LOGIN PAGE - SHOWS PAGE
app.get("/login", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  let templateVars = { user };
  res.render("login", templateVars);
})

// LOGIN - ACCEPTS FORM
app.post("/login", (req, res) => {
  let emailInput = req.body.email;
  let passwordInput = req.body.password;
  if (!checkUserEmailExists(emailInput)) {
    res.status(403).send("This email cannot be found.");
    return;
  } else {
    let user_id = lookupUserId(emailInput);
    if (bcrypt.compareSync(passwordInput, users[user_id].password)) {
      req.session.user_id = user_id; // COOKIE OVER HERE
      res.redirect("/urls");
    } else {
      res.status(403).send("Password does not match");
      return;
    }
  }
});

// SHOWS NEW URL PAGE
app.get("/urls/new", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  if (!user) {
    res.redirect("/login");
    return;
  }
  let templateVars = { user };
  res.render("urls_new", templateVars);
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.user_id = null; // COOKIE OVER HERE
  res.redirect("/urls");
});

// SHOWS INDIVIDUAL URL PAGE
app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  if (!user) {
    res.redirect("/login");
    return;
  }
  if (!belongsToUser(user.id, shortURL)) {
    res.status(401).send("You're not authorised to access this tinyURL.")
    return;
  }
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[shortURL].longURL, user };
  res.render("urls_show", templateVars);
});

// UPDATES LONG URL IN DATABASE
app.post("/urls/:shortURL", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
  if (!user) {
    res.redirect("/login");
    return;
  }
  let shortURL = req.params.shortURL;
  let longURL = req.body.longURL;
  updateURL(shortURL, longURL);
  res.redirect("/urls");
});

// REDIRECTS TO LONG URL, adds https if needed
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL].longURL;
  if (!longURL.startsWith("http")) {
    longURL = "https://" + longURL;
  }
  res.redirect(longURL);
});

// DELETES URL FROM DATABASE
app.post("/urls/:shortURL/delete", (req, res) => {
  let user = users[req.session.user_id]; // COOKIE OVER HERE
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