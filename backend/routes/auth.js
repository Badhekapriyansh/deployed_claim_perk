const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();
const { findByEmail, addUser } = require("../utils/userStore");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, password, ...rest } = user;
  return rest;
}

// POST /api/auth/register  { name, email, password, role, businessName }
// role: "user" (default) or "business". Admin accounts are seeded server-side.
router.post("/register", async (req, res) => {
  const { name, email, password, role, businessName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  const cleanEmail = String(email).trim();
  if (!cleanEmail) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (findByEmail(cleanEmail)) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const finalRole = role === "business" ? "business" : "user";
  if (finalRole === "business" && !businessName) {
    return res.status(400).json({ error: "businessName is required for business accounts" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: cleanEmail.toLowerCase(),
    passwordHash,
    role: finalRole,
    businessName: finalRole === "business" ? String(businessName).trim() : undefined,
    favorites: [],
    history: [],
    createdAt: new Date().toISOString()
  };
  addUser(user);

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const cleanEmail = String(email).trim();

  const user = findByEmail(cleanEmail);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;

