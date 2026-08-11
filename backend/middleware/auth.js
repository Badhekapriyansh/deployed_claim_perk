const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

// Reads "Authorization: Bearer <token>", verifies it, and attaches
// { id, email, name } to req.user. Rejects with 401 if missing/invalid.
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Use after requireAuth. Pass one or more allowed roles, e.g. requireRole("admin")
// or requireRole("business", "admin").
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to access this" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
