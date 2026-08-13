require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing!");
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  TOKEN_EXPIRY: JWT_EXPIRES_IN
};

