const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

function readUsers() {
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findByEmail(email) {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
  return readUsers().find((u) => u.id === id);
}

function addUser(user) {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
}

function updateUser(id, updates) {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  writeUsers(users);
  return users[index];
}

module.exports = { readUsers, writeUsers, findByEmail, findById, addUser, updateUser };
