const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { readCoupons, updateCoupon } = require("../utils/couponStore");
const { readUsers } = require("../utils/userStore");
const Product = require("../models/product");
const productsJSON = require("../data/products.json");

const mongoose = require("mongoose");

async function findProductById(id) {
  if (!id) return null;
  const orConditions = [{ id: String(id) }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    orConditions.push({ _id: id });
  }
  let product = await Product.findOne({ $or: orConditions }).lean();
  if (!product) {
    product = productsJSON.find((p) => p.id === id || String(p._id) === String(id));
  }
  return product;
}

router.use(requireAuth, requireRole("admin"));

// GET /api/admin/coupons?status=pending
router.get("/coupons", async (req, res) => {
  try {
    const { status } = req.query;
    let coupons = readCoupons();
    if (status) coupons = coupons.filter((c) => c.status === status);
    
    const withProduct = [];
    for (const c of coupons) {
      const product = await findProductById(c.productId);
      withProduct.push({ ...c, product });
    }

    res.json({ coupons: withProduct });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin coupons", details: err.message });
  }
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

// GET /api/admin/users
router.get("/users", (req, res) => {
  const users = readUsers().map(({ passwordHash, ...rest }) => rest);
  res.json({ users });
});

// GET /api/admin/stats
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
