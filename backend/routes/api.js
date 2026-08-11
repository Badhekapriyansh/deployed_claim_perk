const express = require("express");
const router = express.Router();
const products = require("../data/products.json");
const offersData = require("../data/offers.json");
const { readCoupons } = require("../utils/couponStore");
const { calculateBestPrice } = require("../utils/priceCalculator");
const { searchLivePrices } = require("../utils/serpApiService");

// Combines the curated sample offers for a product with any approved coupons
// businesses have created for it through the business dashboard.
function getOffersForProduct(productId) {
  const baseOffers = offersData[productId] || { coupons: [], cashback: [], bankOffers: [], upiOffers: [] };
  const approvedBusinessCoupons = readCoupons()
    .filter((c) => c.productId === productId && c.status === "approved")
    .map((c) => ({ id: c.id, code: c.code, type: c.type, value: c.value, maxValue: c.maxValue, source: c.businessName }));

  return {
    ...baseOffers,
    coupons: [...(baseOffers.coupons || []), ...approvedBusinessCoupons]
  };
}

// Helper to parse Company/Brand token from product name
function getBrandName(productName) {
  if (!productName) return "Other";
  const knownBrands = [
    "Apple", "Samsung", "Sony", "OnePlus", "Xiaomi", "Dell", "HP", "Lenovo", "boAt", "JBL",
    "Noise", "Canon", "Fujifilm", "Logitech", "Razer", "Nike", "Adidas", "Puma", "Bata",
    "Woodland", "Zara", "H&M", "Levi's", "Van Heusen", "Allen Solly", "Fabindia", "Biba",
    "W for Woman", "Caprese", "Baggit", "Wildcraft", "American Tourister", "Fossil", "Titan",
    "Fastrack", "Instant Pot", "Prestige", "Philips", "Bajaj", "Wonderchef", "Milton", "IKEA",
    "Nilkamal", "Godrej", "Havells", "Hindware", "Butterfly", "Cello", "Bombay Dyeing"
  ];
  for (const b of knownBrands) {
    if (productName.toLowerCase().startsWith(b.toLowerCase())) return b;
  }
  return productName.split(" ")[0];
}

// GET /api/products?query=phone&category=Electronics&platform=Amazon&brand=Apple&sortBy=savings&page=1&limit=24
// Returns a paginated slice of the mock catalog, optionally filtered by
// search text, category, platform, brand, and sorted by price or savings.
router.get("/products", (req, res) => {
  const { query, category, platform, brand, sortBy } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 100);

  let results = [...products];

  if (query) {
    const q = query.toLowerCase();
    results = results.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (category) {
    results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (platform && platform !== "all") {
    results = results.filter((p) => p.platform && p.platform.toLowerCase() === platform.toLowerCase());
  }
  if (brand && brand !== "all") {
    results = results.filter((p) => getBrandName(p.name).toLowerCase() === brand.toLowerCase());
  }

  if (sortBy) {
    if (sortBy === "price_asc") {
      results.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortBy === "name") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "savings") {
      // Calculate savings for products to sort by discount percentage
      results.sort((a, b) => {
        const offersA = getOffersForProduct(a.id);
        const breakdownA = calculateBestPrice(a.basePrice, offersA);
        const savingsPctA = (breakdownA.totalDiscount / a.basePrice) * 100;

        const offersB = getOffersForProduct(b.id);
        const breakdownB = calculateBestPrice(b.basePrice, offersB);
        const savingsPctB = (breakdownB.totalDiscount / b.basePrice) * 100;

        return savingsPctB - savingsPctA;
      });
    }
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  res.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    products: paged
  });
});

// GET /api/categories -> distinct category names with product counts, for filter chips
router.get("/categories", (req, res) => {
  const counts = {};
  products.forEach((p) => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
  res.json({ categories });
});

// GET /api/platforms -> distinct e-commerce store platforms
router.get("/platforms", (req, res) => {
  const platforms = [...new Set(products.map((p) => p.platform).filter(Boolean))];
  res.json({ platforms });
});

// GET /api/brands -> distinct brand names with product counts
router.get("/brands", (req, res) => {
  const counts = {};
  products.forEach((p) => {
    const brand = getBrandName(p.name);
    counts[brand] = (counts[brand] || 0) + 1;
  });
  const brands = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  res.json({ brands });
});

// GET /api/brands/grouped -> products grouped into Company Brand Hubs
router.get("/brands/grouped", (req, res) => {
  const groups = {};
  products.forEach((p) => {
    const brand = getBrandName(p.name);
    if (!groups[brand]) {
      groups[brand] = {
        brand,
        logo: p.image || "🏷️",
        products: []
      };
    }
    groups[brand].products.push(p);
  });

  const brandHubs = Object.values(groups)
    .filter((g) => g.products.length >= 1)
    .sort((a, b) => b.products.length - a.products.length);

  res.json({ brandHubs });
});

// POST /api/products/compare & GET /api/products/compare
router.all("/products/compare", (req, res) => {
  let ids = [];
  if (req.method === "POST" && req.body && Array.isArray(req.body.productIds)) {
    ids = req.body.productIds;
  } else if (req.query.ids) {
    ids = req.query.ids.split(",");
  }

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Product IDs are required for comparison" });
  }

  const compared = ids.map((id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return null;
    const offers = getOffersForProduct(id);
    const priceBreakdown = calculateBestPrice(product.basePrice, offers);
    return { product, offers, priceBreakdown };
  }).filter(Boolean);

  res.json(compared);
});

// GET /api/products/:id
router.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// GET /api/offers/:productId
// Returns raw offers, multi-platform deal comparison across stores (Amazon, Flipkart, Croma, etc.),
// best price breakdown, and 90-day price history trend.
router.get("/offers/:productId", (req, res) => {
  const product = products.find((p) => p.id === req.params.productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const offers = getOffersForProduct(req.params.productId);
  const mainBreakdown = calculateBestPrice(product.basePrice, offers);

  const encodedName = encodeURIComponent(product.name);

  // Generate multi-platform store deal options with working destination URLs
  const stores = [
    {
      platform: "Amazon",
      logo: "🛒",
      priceMultiplier: 1.0,
      affiliateUrl: `https://www.amazon.in/s?k=${encodedName}&tag=claimperks-21`
    },
    {
      platform: "Flipkart",
      logo: "🛍️",
      priceMultiplier: 1.02,
      affiliateUrl: `https://www.flipkart.com/search?q=${encodedName}`
    },
    {
      platform: "Croma",
      logo: "⚡",
      priceMultiplier: 0.99,
      affiliateUrl: `https://www.croma.com/search/?q=${encodedName}`
    },
    {
      platform: "Reliance Digital",
      logo: "📱",
      priceMultiplier: 1.01,
      affiliateUrl: `https://www.reliancedigital.in/search?q=${encodedName}`
    }
  ];

  const platformDeals = stores.map((s) => {
    const storeBasePrice = Math.round(product.basePrice * s.priceMultiplier);
    const breakdown = calculateBestPrice(storeBasePrice, offers);
    const savingsPercent = Math.round((breakdown.totalDiscount / storeBasePrice) * 100);

    return {
      platform: s.platform,
      logo: s.logo,
      basePrice: storeBasePrice,
      affiliateUrl: s.affiliateUrl,
      offers,
      priceBreakdown: {
        ...breakdown,
        savingsPercent
      }
    };
  });

  // Sort platform deals by lowest final payable price
  platformDeals.sort((a, b) => a.priceBreakdown.finalPrice - b.priceBreakdown.finalPrice);

  // 90-day price history simulation
  const bp = product.basePrice;
  const priceHistory = [
    { label: "90d ago", price: Math.round(bp * 1.14) },
    { label: "60d ago", price: Math.round(bp * 1.08) },
    { label: "45d ago", price: Math.round(bp * 1.18) },
    { label: "30d ago", price: Math.round(bp * 1.05) },
    { label: "15d ago", price: Math.round(bp * 1.02) },
    { label: "Today", price: Math.round(bp) }
  ];

  res.json({
    product,
    offers,
    priceBreakdown: mainBreakdown,
    platformDeals,
    bestDeal: platformDeals[0],
    priceHistory
  });
});

// POST /api/calc-price  { productId }
router.post("/calc-price", (req, res) => {
  const { productId } = req.body;
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const offers = getOffersForProduct(productId);
  const priceBreakdown = calculateBestPrice(product.basePrice, offers);
  res.json(priceBreakdown);
});

// GET /api/live-search?q=iPhone+15 -> Live price comparison across real web stores via SerpApi
router.get("/live-search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });

  const data = await searchLivePrices(q);
  res.json(data);
});

// GET /api/products/:id/live-stores -> Fetch live stores via SerpApi for a product & calculate net final prices
router.get("/products/:id/live-stores", async (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const offers = getOffersForProduct(product.id);
  const serpData = await searchLivePrices(product.name);

  if (serpData.error || !serpData.stores || serpData.stores.length === 0) {
    return res.json({
      product,
      source: "fallback",
      message: serpData.error || "No live stores found, using database values",
      stores: []
    });
  }

  // Calculate ClaimPerks final payable price for each real live store
  const storeDeals = serpData.stores.map((s) => {
    const breakdown = calculateBestPrice(s.basePrice > 0 ? s.basePrice : product.basePrice, offers);
    return {
      title: s.title,
      storeName: s.storeName,
      listedPrice: s.price,
      basePrice: s.basePrice,
      url: s.url,
      thumbnail: s.thumbnail,
      rating: s.rating,
      delivery: s.delivery,
      priceBreakdown: breakdown
    };
  });

  // Sort by lowest final payable price after applying perks
  storeDeals.sort((a, b) => a.priceBreakdown.finalPrice - b.priceBreakdown.finalPrice);

  res.json({
    product,
    source: "serpapi_live",
    totalStores: storeDeals.length,
    bestLiveDeal: storeDeals[0],
    stores: storeDeals
  });
});

// POST /api/ai/assistant -> Intelligent Shopping & Savings AI Assistant
router.post("/ai/assistant", (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message string is required" });
  }

  const q = message.toLowerCase();

  // Search relevant products
  let matched = products.filter(
    (p) =>
      q.includes(p.name.toLowerCase()) ||
      q.includes(p.category.toLowerCase()) ||
      q.includes(p.platform.toLowerCase())
  );

  if (matched.length === 0) {
    // Fallback: pick top 3 popular products across categories
    matched = products.slice(0, 3);
  } else {
    matched = matched.slice(0, 3);
  }

  const dealRecommendations = matched.map((p) => {
    const offers = getOffersForProduct(p.id);
    const breakdown = calculateBestPrice(p.basePrice, offers);
    const savedPct = Math.round((breakdown.totalDiscount / p.basePrice) * 100);
    return {
      product: p,
      finalPrice: breakdown.finalPrice,
      totalDiscount: breakdown.totalDiscount,
      savedPercent: savedPct,
      bestPaymentMethod: breakdown.bestPaymentMethod?.label || "HDFC/ICICI Card or GPay UPI"
    };
  });

  let responseText = "";
  if (q.includes("hdfc") || q.includes("icici") || q.includes("sbi") || q.includes("card") || q.includes("bank")) {
    responseText = `I analyzed available card perks! Bank cards (HDFC & ICICI) offer the highest flat cashback (up to ₹1,500) on electronics. Here are the top matches with maximum bank savings:`;
  } else if (q.includes("upi") || q.includes("gpay") || q.includes("phonepe") || q.includes("paytm")) {
    responseText = `UPI offers give instant flat discounts up to ₹300 across Grocery, Books & Accessories. Here are recommended deals where UPI payments yield the best price:`;
  } else if (q.includes("phone") || q.includes("laptop") || q.includes("electronics")) {
    responseText = `Here are the highest-rated electronics deals calculated with live coupon stacking & bank card discounts:`;
  } else {
    responseText = `Based on current live coupon campaigns, bank offers, and cashback rules, here are the smartest savings recommendations for your query:`;
  }

  res.json({
    reply: responseText,
    recommendations: dealRecommendations
  });
});

module.exports = router;
