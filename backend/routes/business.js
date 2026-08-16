const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { readCoupons, addCoupon, deleteCoupon, findById } = require("../utils/couponStore");
const { findById: findUserById } = require("../utils/userStore");
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

router.use(requireAuth, requireRole("business"));

// GET /api/business/coupons -> only this business's own campaigns
router.get("/coupons", async (req, res) => {
  try {
    const mine = readCoupons().filter((c) => c.businessId === req.user.id);
    const result = [];
    for (const c of mine) {
      const product = await findProductById(c.productId);
      result.push({ ...c, product });
    }
    res.json({ coupons: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coupons", details: err.message });
  }
});

// POST /api/business/coupons { productId, code, type, value, maxValue }
router.post("/coupons", async (req, res) => {
  try {
    const { productId, code, type, value, maxValue } = req.body;

    if (!productId || !code || !type || value === undefined) {
      return res.status(400).json({ error: "productId, code, type and value are required" });
    }
    if (!["flat", "percent"].includes(type)) {
      return res.status(400).json({ error: "type must be 'flat' or 'percent'" });
    }
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const bizUser = findUserById(req.user.id);

    const coupon = {
      id: crypto.randomUUID(),
      businessId: req.user.id,
      businessName: bizUser?.businessName || bizUser?.name || "Business",
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
  } catch (err) {
    res.status(500).json({ error: "Failed to create coupon", details: err.message });
  }
});

// DELETE /api/business/coupons/:id
router.delete("/coupons/:id", (req, res) => {
  const coupon = findById(req.params.id);
  if (!coupon) return res.status(404).json({ error: "Coupon not found" });
  if (coupon.businessId !== req.user.id) {
    return res.status(403).json({ error: "You can only remove your own campaigns" });
  }
  deleteCoupon(req.params.id);
  res.json({ success: true });
});

// GET /api/business/analytics
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
