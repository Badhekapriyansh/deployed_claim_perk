const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();
const { findByEmail, addUser } = require("../utils/userStore");
const { JWT_SECRET, TOKEN_EXPIRY } = require("../config");

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, businessName: user.businessName },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/register  { name, email, password, role, businessName }
// role: "user" (default) or "business". Admin accounts are seeded server-side,
// not created through this endpoint.
router.post("/register", async (req, res) => {
  const { name, email, password, role, businessName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (findByEmail(email)) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const finalRole = role === "business" ? "business" : "user";
  if (finalRole === "business" && !businessName) {
    return res.status(400).json({ error: "businessName is required for business accounts" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    role: finalRole,
    businessName: finalRole === "business" ? businessName : undefined,
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

  const user = findByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

module.exports = router;
