const generateRandomString = function() {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  } return result;
};

const updateURL = (shortURL, longURL, database) => {
  database[shortURL].longURL = longURL;
};

const checkUserEmailExists = function(email, database) {
  return Object.values(database).some(element => element.email === email);
};

const getUserByEmail = function(emailLookup, database) {
  if (!Object.values(database).find(user => user.email === emailLookup)) {
    return undefined;
  }
  return Object.values(database).find(user => user.email === emailLookup).id;
};

const urlsForUser = function(id, database) {
  let matchingKeys = [], userFilteredUrlDatabase = {};
  for (let url in database) {
    if (database[url].userID === id) {
      matchingKeys.push(url);
    }
  }
  matchingKeys.forEach(key => {
    userFilteredUrlDatabase[key] = database[key];
  });
  return userFilteredUrlDatabase;
};

const belongsToUser = function(id, shortURL, database) {
  let usersUrls = urlsForUser(id, database); let found = false;
  Object.keys(usersUrls).forEach(url => {
    if (url === shortURL) {
      found = true;
    }
  }); return found;
};

const sumTotalVisits = function(database, shortURL) {
  if (!database[shortURL]) {
    return 0;
  }
  let visitsArray = Object.values(database[shortURL]);
  let total = 0;
  visitsArray.forEach(element => {
    total += element;
  }); return total;
};

const countUniqueVistors = function(database, shortURL) {
  if (!database[shortURL]) {
    return 0;
  }
  return Object.keys(database[shortURL]).length;
};

module.exports = {
  generateRandomString,
  updateURL,
  checkUserEmailExists,
  getUserByEmail,
  urlsForUser,
  belongsToUser,
  sumTotalVisits,
  countUniqueVistors
};