// NOTE: hardcoded for prototype simplicity. Before any real deployment,
// move this to an environment variable (process.env.JWT_SECRET).
const JWT_SECRET = "claim-perks-prototype-secret-change-in-production";
const TOKEN_EXPIRY = "7d";

module.exports = { JWT_SECRET, TOKEN_EXPIRY };
