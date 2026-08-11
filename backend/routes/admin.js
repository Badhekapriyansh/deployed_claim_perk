const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { readCoupons, updateCoupon } = require("../utils/couponStore");
const { readUsers } = require("../utils/userStore");
const products = require("../data/products.json");

router.use(requireAuth, requireRole("admin"));

// GET /api/admin/coupons?status=pending  (status optional: pending|approved|rejected)
router.get("/coupons", (req, res) => {
  const { status } = req.query;
  let coupons = readCoupons();
  if (status) coupons = coupons.filter((c) => c.status === status);
  const withProduct = coupons.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }));
  res.json({ coupons: withProduct });
});

// POST /api/admin/coupons/:id/approve
router.post("/coupons/:id/approve", (req, res) => {
  const updated = updateCoupon(req.params.id, { status: "approved" });
  if (!updated) return res.status(404).json({ error: "Coupon not found" });
  res.json({ coupon: updated });
});

// POST /api/admin/coupons/:id/reject
router.post("/coupons/:id/reject", (req, res) => {
  const updated = updateCoupon(req.params.id, { status: "rejected" });
  if (!updated) return res.status(404).json({ error: "Coupon not found" });
  res.json({ coupon: updated });
});

// GET /api/admin/users -> user management list (no password hashes)
router.get("/users", (req, res) => {
  const users = readUsers().map(({ passwordHash, ...rest }) => rest);
  res.json({ users });
});

// GET /api/admin/stats -> quick counts for the admin analytics dashboard
router.get("/stats", (req, res) => {
  const users = readUsers();
  const coupons = readCoupons();

  res.json({
    totalUsers: users.filter((u) => u.role === "user").length,
    totalBusinesses: users.filter((u) => u.role === "business").length,
    totalCoupons: coupons.length,
    pendingCoupons: coupons.filter((c) => c.status === "pending").length,
    approvedCoupons: coupons.filter((c) => c.status === "approved").length,
    rejectedCoupons: coupons.filter((c) => c.status === "rejected").length
  });
});

module.exports = router;
