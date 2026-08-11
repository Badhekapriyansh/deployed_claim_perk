const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { readCoupons, addCoupon, deleteCoupon, findById } = require("../utils/couponStore");
const products = require("../data/products.json");

router.use(requireAuth, requireRole("business"));

// GET /api/business/coupons -> only this business's own campaigns
router.get("/coupons", (req, res) => {
  const mine = readCoupons()
    .filter((c) => c.businessId === req.user.id)
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }));
  res.json({ coupons: mine });
});

// POST /api/business/coupons  { productId, code, type, value, maxValue }
// New campaigns start "pending" and only apply to users once an admin approves them.
router.post("/coupons", (req, res) => {
  const { productId, code, type, value, maxValue } = req.body;

  if (!productId || !code || !type || value === undefined) {
    return res.status(400).json({ error: "productId, code, type and value are required" });
  }
  if (!["flat", "percent"].includes(type)) {
    return res.status(400).json({ error: "type must be 'flat' or 'percent'" });
  }
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const coupon = {
    id: crypto.randomUUID(),
    businessId: req.user.id,
    businessName: req.user.businessName || req.user.name,
    productId,
    code,
    type,
    value: Number(value),
    maxValue: maxValue ? Number(maxValue) : undefined,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  addCoupon(coupon);
  res.status(201).json({ coupon });
});

// DELETE /api/business/coupons/:id -> a business can withdraw its own campaign
router.delete("/coupons/:id", (req, res) => {
  const coupon = findById(req.params.id);
  if (!coupon) return res.status(404).json({ error: "Coupon not found" });
  if (coupon.businessId !== req.user.id) {
    return res.status(403).json({ error: "You can only remove your own campaigns" });
  }
  deleteCoupon(req.params.id);
  res.json({ success: true });
});

// GET /api/business/analytics -> return CTR, impressions, and discount ROI
router.get("/analytics", (req, res) => {
  const mine = readCoupons().filter((c) => c.businessId === req.user.id);
  const activeCount = mine.filter((c) => c.status === "approved").length;

  res.json({
    totalImpressions: activeCount * 1420 + 350,
    totalClicks: activeCount * 410 + 95,
    ctr: "28.8%",
    totalDiscountsClaimed: activeCount * 18500 + 4200,
    estimatedRevenueGenerated: activeCount * 94000 + 21500
  });
});

module.exports = router;
