require("dotenv").config();
const connectDB = require("./db");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const businessRoutes = require("./routes/business");
const adminRoutes = require("./routes/admin");
const ingestionRoutes = require("./routes/ingestion");
const { findByEmail, addUser } = require("./utils/userStore");

const app = express();
const PORT = process.env.PORT || 5000;

const ADMIN_EMAIL = "admin@claimperks.com";
const ADMIN_PASSWORD = "admin123"; // prototype only — change before any real deployment

// Ensures a working admin login always exists, so judges/testers don't need
// a separate signup path for the admin role.
async function seedAdmin() {
  if (findByEmail(ADMIN_EMAIL)) return;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  addUser({
    id: crypto.randomUUID(),
    name: "Claim Perks Admin",
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    favorites: [],
    history: [],
    createdAt: new Date().toISOString()
  });
  console.log(`Seeded admin account -> ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ingestion", ingestionRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Claim Perks API is running",
    endpoints: [
      "/api/products",
      "/api/offers/:productId",
      "/api/calc-price",
      "/api/auth/register",
      "/api/auth/login",
      "/api/user/me",
      "/api/user/favorites",
      "/api/user/history",
      "/api/business/coupons",
      "/api/admin/coupons",
      "/api/admin/users",
      "/api/admin/stats"
    ]
  });
});

connectDB().then(() => {
  seedAdmin().then(() => {
    app.listen(PORT, () => {
      console.log(`Claim Perks API running on http://localhost:${PORT}`);
    });
  });
});
