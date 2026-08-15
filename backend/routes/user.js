const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { findById, updateUser } = require("../utils/userStore");
const Product = require("../models/product");
const productsJSON = require("../data/products.json");

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function findProductById(id) {
  let product = await Product.findOne({ id }).lean();
  if (!product) {
    product = productsJSON.find((p) => p.id === id);
  }
  return product;
}

// All routes below require a valid JWT (Authorization: Bearer <token>)
router.use(requireAuth);

// GET /api/user/me
router.get("/me", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
});

// GET /api/user/favorites -> full product objects, not just ids
router.get("/favorites", async (req, res) => {
  try {
    const user = findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const favoriteProducts = [];
    for (const favId of (user.favorites || [])) {
      const p = await findProductById(favId);
      if (p) favoriteProducts.push(p);
    }
    res.json({ favorites: favoriteProducts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch favorites", details: err.message });
  }
});

// POST /api/user/favorites/:productId -> toggle a product as favorite
router.post("/favorites/:productId", async (req, res) => {
  try {
    const user = findById(req.user.id);
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const alreadyFavorited = user.favorites.includes(productId);
    const favorites = alreadyFavorited
      ? user.favorites.filter((id) => id !== productId)
      : [...user.favorites, productId];

    const updated = updateUser(user.id, { favorites });
    res.json({ favorites: updated.favorites, favorited: !alreadyFavorited });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle favorite", details: err.message });
  }
});

// GET /api/user/history -> recent products viewed, most recent first
router.get("/history", async (req, res) => {
  try {
    const user = findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const sortedHistory = [...user.history]
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
      .slice(0, 20);

    const historyWithProducts = [];
    for (const entry of sortedHistory) {
      const product = await findProductById(entry.productId);
      if (product) {
        historyWithProducts.push({ ...entry, product });
      }
    }

    res.json({ history: historyWithProducts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
});

// POST /api/user/history/:productId -> log a product view
router.post("/history/:productId", async (req, res) => {
  try {
    const user = findById(req.user.id);
    const { productId } = req.params;
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const history = user.history.filter((h) => h.productId !== productId);
    history.push({ productId, viewedAt: new Date().toISOString() });

    const updated = updateUser(user.id, { history });
    res.json({ history: updated.history });
  } catch (err) {
    res.status(500).json({ error: "Failed to log history", details: err.message });
  }
});

// DELETE /api/user/history -> clear all viewing history
router.delete("/history", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  updateUser(user.id, { history: [] });
  res.json({ success: true, history: [] });
});

// DELETE /api/user/history/:productId -> remove single item from history
router.delete("/history/:productId", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const history = (user.history || []).filter((h) => h.productId !== req.params.productId);
  updateUser(user.id, { history });
  res.json({ success: true, history });
});

// PUT /api/user/profile -> update user profile details & preferences
router.put("/profile", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, preferredBank, preferredUpi, address } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (preferredBank !== undefined) updates.preferredBank = preferredBank;
  if (preferredUpi !== undefined) updates.preferredUpi = preferredUpi;
  if (address !== undefined) updates.address = address;

  const updated = updateUser(user.id, updates);
  res.json(publicUser(updated));
});

// GET /api/user/redirects -> return explored deal redirects
router.get("/redirects", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ redirects: user.redirects || [] });
});

// POST /api/user/redirects -> log when a user redirects to a store platform
router.post("/redirects", async (req, res) => {
  try {
    const user = findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { productId, platform, basePrice, finalPrice, totalDiscount, affiliateUrl } = req.body;
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const redirectEntry = {
      id: `RED-${Date.now()}`,
      productId,
      productName: product.name,
      productImage: product.image,
      platform: platform || product.platform,
      basePrice: basePrice || product.basePrice,
      finalPrice: finalPrice || product.basePrice,
      totalDiscount: totalDiscount || 0,
      affiliateUrl: affiliateUrl || null,
      timestamp: new Date().toISOString()
    };

    const redirects = [redirectEntry, ...(user.redirects || [])].slice(0, 25);

    const currentWallet = user.wallet || { balance: 250, transactions: [] };
    const walletTransaction = {
      id: `TXN-${Date.now()}`,
      type: "credit",
      title: `Perks Bonus: Jumped to ${platform || "Store"}`,
      amount: 50,
      date: new Date().toISOString()
    };
    const updatedWallet = {
      balance: (currentWallet.balance || 0) + 50,
      transactions: [walletTransaction, ...(currentWallet.transactions || [])]
    };

    updateUser(user.id, { redirects, wallet: updatedWallet });

    res.status(201).json({ success: true, redirect: redirectEntry, wallet: updatedWallet });
  } catch (err) {
    res.status(500).json({ error: "Failed to log redirect", details: err.message });
  }
});

// DELETE /api/user/redirects -> clear all explored deal redirects
router.delete("/redirects", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  updateUser(user.id, { redirects: [] });
  res.json({ success: true, redirects: [] });
});

// DELETE /api/user/redirects/:id -> remove single deal redirect entry
router.delete("/redirects/:id", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const redirects = (user.redirects || []).filter((r) => r.id !== req.params.id);
  updateUser(user.id, { redirects });
  res.json({ success: true, redirects });
});

// GET /api/user/orders -> return user's orders
router.get("/orders", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ orders: user.orders || [] });
});

// POST /api/user/orders -> create a new order & invoice
router.post("/orders", async (req, res) => {
  try {
    const user = findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { productId, paymentMethod, shippingAddress, cardOrUpi } = req.body;
    const product = await findProductById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const offersData = require("../data/offers.json");
    const { readCoupons } = require("../utils/couponStore");
    const { calculateBestPrice } = require("../utils/priceCalculator");

    const baseOffers = offersData[productId] || { coupons: [], cashback: [], bankOffers: [], upiOffers: [] };
    const approvedCoupons = readCoupons().filter((c) => c.productId === productId && c.status === "approved");
    const offers = { ...baseOffers, coupons: [...(baseOffers.coupons || []), ...approvedCoupons] };

    const priceBreakdown = calculateBestPrice(product.basePrice, offers);

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceId = `CP-INV-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = {
      id: orderId,
      invoiceId,
      productId,
      productName: product.name,
      productImage: product.image,
      platform: product.platform,
      basePrice: priceBreakdown.basePrice,
      totalDiscount: priceBreakdown.totalDiscount,
      finalPrice: priceBreakdown.finalPrice,
      paymentMethod: paymentMethod || "Credit Card",
      shippingAddress: shippingAddress || user.address || "Main Address",
      cardOrUpi: cardOrUpi || "•••• 4242",
      createdAt: new Date().toISOString()
    };

    const orders = [newOrder, ...(user.orders || [])];

    const earnedCashback = Math.round(priceBreakdown.finalPrice * 0.05);
    const currentWallet = user.wallet || { balance: 250, transactions: [] };
    const walletTransaction = {
      id: `TXN-${Date.now()}`,
      type: "credit",
      title: `Cashback: ${product.name}`,
      amount: earnedCashback,
      date: new Date().toISOString()
    };
    const updatedWallet = {
      balance: (currentWallet.balance || 0) + earnedCashback,
      transactions: [walletTransaction, ...(currentWallet.transactions || [])]
    };

    const notifications = [
      {
        id: `NOTIF-${Date.now()}`,
        title: "Order Placed & Cashback Earned! 🎉",
        message: `You earned ₹${earnedCashback} cashback in your Perks Wallet for ordering ${product.name}!`,
        date: new Date().toISOString(),
        read: false
      },
      ...(user.notifications || [])
    ];

    updateUser(user.id, { orders, wallet: updatedWallet, notifications });

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create order", details: err.message });
  }
});

// GET /api/user/wallet -> return wallet balance & transactions
router.get("/wallet", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const wallet = user.wallet || {
    balance: 450,
    transactions: [
      { id: "TXN-101", type: "credit", title: "Welcome Perks Bonus", amount: 250, date: new Date().toISOString() },
      { id: "TXN-102", type: "credit", title: "Referral Bonus (Alex)", amount: 200, date: new Date().toISOString() }
    ]
  };
  res.json({ wallet });
});

// POST /api/user/wallet/withdraw -> payout wallet balance to UPI ID
router.post("/wallet/withdraw", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { amount, upiId } = req.body;
  const currentWallet = user.wallet || { balance: 450, transactions: [] };

  if (amount <= 0 || amount > currentWallet.balance) {
    return res.status(400).json({ error: "Insufficient wallet balance or invalid amount." });
  }

  const txn = {
    id: `WD-${Date.now()}`,
    type: "debit",
    title: `UPI Transfer to ${upiId}`,
    amount,
    date: new Date().toISOString()
  };

  const updatedWallet = {
    balance: currentWallet.balance - amount,
    transactions: [txn, ...(currentWallet.transactions || [])]
  };

  updateUser(user.id, { wallet: updatedWallet });
  res.json({ success: true, wallet: updatedWallet, transaction: txn });
});

// GET /api/user/notifications -> return unread and read alerts
router.get("/notifications", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const notifications = user.notifications || [
    {
      id: "N1",
      title: "🔥 Price Drop Alert!",
      message: "Apple iPhone 15 price dropped by ₹3,500 on Amazon!",
      date: new Date().toISOString(),
      read: false
    },
    {
      id: "N2",
      title: "💰 Perks Bonus Credited",
      message: "₹200 referral bonus credited to your Perks Wallet.",
      date: new Date().toISOString(),
      read: true
    }
  ];
  res.json({ notifications });
});

// POST /api/user/alerts -> subscribe to price drop alert
router.post("/alerts", (req, res) => {
  const user = findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { productId, targetPrice } = req.body;
  const alerts = [...(user.priceAlerts || []), { productId, targetPrice, createdAt: new Date().toISOString() }];
  updateUser(user.id, { priceAlerts: alerts });
  res.json({ success: true, alerts });
});

module.exports = router;
