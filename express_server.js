const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(morgan("dev"));

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
  let user = users[req.cookies["user_id"]];
  if (!user) {
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
  let user = req.cookies["user_id"];
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: user };
  res.redirect(`/urls/${shortURL}`);
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
  let user = users[req.cookies["user_id"]];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// UPDATES LONG URL IN DATABASE
app.post("/urls/:shortURL", (req, res) => {
  let user = users[req.cookies["user_id"]];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let shortURL = req.params.shortURL;
  let longURL = req.body.longURL;
  updateURL(shortURL, longURL);
  res.redirect("/urls");
});

// LOGIN PAGE - SHOWS PAGE
app.get("/login", (req, res) => {
  let user = users[req.cookies["user_id"]];
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
    if (passwordInput !== users[user_id].password) {
      res.status(403).send("Password does not match");
      return;
    } else {
      res.cookie("user_id", user_id);
      res.redirect("/urls");
    }
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

// REGISTRATION PAGE
app.get("/register", (req, res) => {
  let user = users[req.cookies["user_id"]];
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
  users[userID] = { id: userID, email: req.body.email, password: req.body.password };
  res.cookie("user_id", userID);
  res.redirect("/urls");
});

// SHOWS NEW URL PAGE
app.get("/urls/new", (req, res) => {
  let user = users[req.cookies["user_id"]];
  if (!user) {
    res.redirect("/login");
    return;
  }
  let templateVars = { user };
  res.render("urls_new", templateVars);
});

// SHOWS INDIVIDUAL URL PAGE
app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let user = users[req.cookies["user_id"]];
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

app.listen(PORT, () => {
  console.log(`Susan's tinyapp listening on port ${PORT}!`);
});