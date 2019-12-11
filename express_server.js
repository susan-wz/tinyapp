const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
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
  urlDatabase[shortURL] = longURL;
};

const checkUserEmailExists = function (email) {
  return Object.values(users).some(element => element.email === email);
};

const lookupUserId = function(emailLookup) {
  return Object.values(users).find(user => user.email === emailLookup).id
  };
  

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
  let templateVars = { urls: urlDatabase, user };
  res.render("urls_index", templateVars);
});

// CREATES NEW SHORTENED URL
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  console.log("Current urlDatabase:\n", urlDatabase);
  res.redirect(`/urls/${shortURL}`);
});

// REDIRECTS TO LONG URL, adds https if needed
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL];
  if (!longURL.startsWith("http")) {
    longURL = "https://" + longURL;
  }
  res.redirect(longURL);
});

// DELETES URL FROM DATABASE
app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// UPDATES LONG URL IN DATABASE
app.post("/urls/:shortURL", (req, res) => {
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
    console.log("the users database: ", users);
    let user_id = lookupUserId(emailInput);
    console.log("the user_id gettind checked: ", user_id)
    if (passwordInput !== users[user_id].password) {
      res.status(403).send("Password does not match");
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
  let templateVars = { user };
  res.render("urls_new", templateVars);
});

// SHOWS INDIVIDUAL URL PAGE
app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let user = users[req.cookies["user_id"]];
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[shortURL], user };
  res.render("urls_show", templateVars);
});

app.listen(PORT, () => {
  console.log(`Susan's tinyapp listening on port ${PORT}!`);
});