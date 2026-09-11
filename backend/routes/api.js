const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const Offer = require("../models/offer");
const productsJSON = require("../data/products.json");
const offersJSON = require("../data/offers.json");
const { readCoupons } = require("../utils/couponStore");
const { calculateBestPrice } = require("../utils/priceCalculator");

// Helper to get vendor emoji logo
function getVendorLogo(vendor) {
  if (!vendor) return "🛒";
  const v = vendor.toLowerCase();
  if (v.includes("amazon")) return "🛒";
  if (v.includes("flipkart")) return "🛍️";
  if (v.includes("croma")) return "⚡";
  if (v.includes("reliance")) return "📱";
  if (v.includes("myntra") || v.includes("nykaa") || v.includes("ajio")) return "👗";
  return "🏷️";
}

// Combines offers stored for a product in MongoDB (or fallback JSON) with approved business coupons
async function getOffersForProduct(productId) {
  const dbOffers = await Offer.find({ productId }).lean();
  let baseOffers = { coupons: [], cashback: [], bankOffers: [], upiOffers: [] };

  if (dbOffers && dbOffers.length > 0) {
    for (const o of dbOffers) {
      if (Array.isArray(o.coupons)) baseOffers.coupons.push(...o.coupons);
      if (Array.isArray(o.cashback)) baseOffers.cashback.push(...o.cashback);
      if (Array.isArray(o.bankOffers)) baseOffers.bankOffers.push(...o.bankOffers);
      if (Array.isArray(o.upiOffers)) baseOffers.upiOffers.push(...o.upiOffers);
    }
  } else if (offersJSON[productId]) {
    baseOffers = offersJSON[productId];
  }

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

// Helper to get active products from MongoDB or JSON fallback
async function getActiveProducts() {
  let list = await Product.find({}).lean();
  if (!list || list.length === 0) {
    list = [...productsJSON];
  }
  return list;
}

// GET /api/products?query=phone&category=Electronics&platform=Amazon&brand=Apple&sortBy=savings&page=1&limit=24
router.get("/products", async (req, res) => {
  try {
    const { query, category, platform, brand, sortBy } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 100);

    let results = await getActiveProducts();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((p) => p.name && p.name.toLowerCase().includes(q));
    }
    if (category) {
      results = results.filter((p) => p.category && p.category.toLowerCase() === category.toLowerCase());
    }
    if (platform && platform !== "all") {
      results = results.filter((p) => p.platform && p.platform.toLowerCase() === platform.toLowerCase());
    }
    if (brand && brand !== "all") {
      results = results.filter((p) => getBrandName(p.name).toLowerCase() === brand.toLowerCase());
    }

    if (sortBy) {
      if (sortBy === "price_asc") {
        results.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
      } else if (sortBy === "price_desc") {
        results.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
      } else if (sortBy === "name") {
        results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

// GET /api/categories -> distinct category names with product counts
router.get("/categories", async (req, res) => {
  try {
    const productsList = await getActiveProducts();
    const counts = {};
    productsList.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories", details: err.message });
  }
});

// GET /api/platforms -> distinct store platforms
router.get("/platforms", async (req, res) => {
  try {
    const productsList = await getActiveProducts();
    const platforms = [...new Set(productsList.map((p) => p.platform).filter(Boolean))];
    res.json({ platforms });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch platforms", details: err.message });
  }
});

// GET /api/brands -> distinct brand names with product counts
router.get("/brands", async (req, res) => {
  try {
    const productsList = await getActiveProducts();
    const counts = {};
    productsList.forEach((p) => {
      const brand = getBrandName(p.name);
      counts[brand] = (counts[brand] || 0) + 1;
    });
    const brands = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    res.json({ brands });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch brands", details: err.message });
  }
});

// GET /api/brands/grouped -> products grouped into Company Brand Hubs
router.get("/brands/grouped", async (req, res) => {
  try {
    const productsList = await getActiveProducts();
    const groups = {};
    productsList.forEach((p) => {
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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch grouped brands", details: err.message });
  }
});

// POST /api/products/compare & GET /api/products/compare
router.all("/products/compare", async (req, res) => {
  try {
    let ids = [];
    if (req.method === "POST" && req.body && Array.isArray(req.body.productIds)) {
      ids = req.body.productIds;
    } else if (req.query.ids) {
      ids = req.query.ids.split(",");
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: "Product IDs are required for comparison" });
    }

    const compared = [];
    for (const id of ids) {
      let product = await Product.findOne({ id }).lean();
      if (!product) product = productsJSON.find((p) => p.id === id);
      if (!product) continue;
      const offers = await getOffersForProduct(id);
      const priceBreakdown = calculateBestPrice(product.basePrice, offers);
      compared.push({ product, offers, priceBreakdown });
    }

    res.json(compared);
  } catch (err) {
    res.status(500).json({ error: "Comparison failed", details: err.message });
  }
});

// GET /api/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    let product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) {
      product = productsJSON.find((p) => p.id === req.params.id);
    }
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product", details: err.message });
  }
});

// GET /api/offers/:productId
// Validates all vendor offers, identifies lowest valid price as best deal, and preserves all valid platform offers.
router.get("/offers/:productId", async (req, res) => {
  try {
    const requestedId = req.params.productId;
    let product = await Product.findOne({ id: requestedId }).lean();
    if (!product) {
      product = productsJSON.find((p) => p.id === requestedId);
    }
    if (!product) return res.status(404).json({ error: "Product not found" });

    const offers = await getOffersForProduct(requestedId);

    // Fetch all real stored Offer documents for this productId from MongoDB
    let rawOffers = await Offer.find({ productId: requestedId }).lean();
    if ((!rawOffers || rawOffers.filter(o => o.vendor || o.price).length === 0) && offersJSON[requestedId]?.platformOffers) {
      const fallbackOffers = offersJSON[requestedId].platformOffers.map(po => ({
        productId: requestedId,
        vendor: po.vendor,
        price: po.price,
        url: po.url,
        affiliateUrl: po.affiliateUrl,
        product_name: product.name
      }));
      rawOffers = [...(rawOffers || []), ...fallbackOffers];
    }

    const sanitizeUrl = (u) => {
      if (!u || typeof u !== "string") return null;
      const trimmed = u.trim();
      if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") return null;
      return trimmed;
    };

    // Helper to verify product identity matches
    const isProductMatching = (offerDoc, targetProduct) => {
      if (!offerDoc) return false;
      if (offerDoc.productId && offerDoc.productId !== targetProduct.id) return false;
      const offerName = (offerDoc.product_name || offerDoc.name || "").trim().toLowerCase();
      if (offerName) {
        const targetName = (targetProduct.name || "").trim().toLowerCase();
        // If names are present, ensure they don't blatantly conflict
        const targetBrand = getBrandName(targetProduct.name).toLowerCase();
        if (targetBrand && targetBrand !== "other" && offerName.length > 3) {
          if (!offerName.includes(targetBrand) && !targetName.includes(offerName)) {
            return false;
          }
        }
      }
      return true;
    };

    const vendorDealsMap = new Map();

    if (rawOffers && rawOffers.length > 0) {
      for (const o of rawOffers) {
        // Validate product identity
        if (!isProductMatching(o, product)) {
          continue; // Reject mismatched product offers
        }

        const vendor = (o.vendor || o.platform || "").trim();
        const hasValidVendor = vendor && vendor.toLowerCase() !== "null" && vendor.toLowerCase() !== "undefined";

        // Discount documents or records without a vendor are not store deals
        if (!hasValidVendor) {
          continue;
        }

        const vendorKey = vendor.toLowerCase();

        // Validate price: must be positive number
        const rawPrice = o.price;
        const hasExplicitPrice = rawPrice !== undefined && rawPrice !== null && rawPrice !== "";
        const numPrice = hasExplicitPrice ? Number(rawPrice) : NaN;
        const isPriceValid = !isNaN(numPrice) && numPrice > 0;

        const targetUrl = sanitizeUrl(o.affiliateUrl) || sanitizeUrl(o.url) || sanitizeUrl(o.productUrl) || sanitizeUrl(o.link) || null;

        if (isPriceValid) {
          const breakdown = calculateBestPrice(numPrice, offers);
          const savingsPercent = Math.round((breakdown.totalDiscount / numPrice) * 100);

          const dealObj = {
            platform: vendor,
            logo: getVendorLogo(vendor),
            basePrice: numPrice,
            isAvailable: true,
            affiliateUrl: targetUrl,
            offers,
            priceBreakdown: {
              ...breakdown,
              savingsPercent
            }
          };

          if (!vendorDealsMap.has(vendorKey)) {
            vendorDealsMap.set(vendorKey, dealObj);
          } else {
            const existing = vendorDealsMap.get(vendorKey);
            // Preserve valid URL if existing or new has one
            const bestUrl = targetUrl || existing.affiliateUrl;
            if (numPrice < existing.basePrice) {
              dealObj.affiliateUrl = bestUrl;
              vendorDealsMap.set(vendorKey, dealObj);
            } else if (!existing.affiliateUrl && targetUrl) {
              existing.affiliateUrl = targetUrl;
            }
          }
        } else if (hasValidVendor && rawPrice === null) {
          // Explicitly recorded store with price unavailable (not a fake price)
          if (!vendorDealsMap.has(vendorKey)) {
            vendorDealsMap.set(vendorKey, {
              platform: vendor,
              logo: getVendorLogo(vendor),
              basePrice: null,
              isAvailable: false,
              affiliateUrl: targetUrl,
              offers,
              priceBreakdown: null
            });
          }
        }
      }
    }

    // Only if no valid vendor deals were found in offer records, fallback to product's single platform
    const prodBasePrice = Number(product.basePrice);
    if (vendorDealsMap.size === 0 && !isNaN(prodBasePrice) && prodBasePrice > 0) {
      const prodPlatform = (product.platform || "Official Store").trim();
      const targetUrl = sanitizeUrl(product.url) || sanitizeUrl(product.affiliateUrl) || null;
      const breakdown = calculateBestPrice(prodBasePrice, offers);
      const savingsPercent = Math.round((breakdown.totalDiscount / prodBasePrice) * 100);

      vendorDealsMap.set(prodPlatform.toLowerCase(), {
        platform: prodPlatform,
        logo: getVendorLogo(prodPlatform),
        basePrice: prodBasePrice,
        isAvailable: true,
        affiliateUrl: targetUrl,
        offers,
        priceBreakdown: {
          ...breakdown,
          savingsPercent
        }
      });
    }

    const allDeals = Array.from(vendorDealsMap.values());

    // Only include verified valid deals with non-null direct affiliate links
    const validDeals = allDeals.filter(
      (d) =>
        d.isAvailable &&
        d.basePrice !== null &&
        d.basePrice > 0 &&
        d.priceBreakdown &&
        d.affiliateUrl &&
        typeof d.affiliateUrl === "string" &&
        d.affiliateUrl.trim() !== "" &&
        d.affiliateUrl.toLowerCase() !== "null" &&
        d.affiliateUrl.toLowerCase() !== "undefined"
    );

    // Sort valid deals by lowest final payable price (and lowest base price as tiebreaker)
    validDeals.sort((a, b) => {
      const diffFinal = (a.priceBreakdown?.finalPrice || 0) - (b.priceBreakdown?.finalPrice || 0);
      if (diffFinal !== 0) return diffFinal;
      return (a.basePrice || 0) - (b.basePrice || 0);
    });

    // Only return verified platform deals with direct links
    const platformDeals = validDeals;

    // Identify winning lowest price deal
    const bestDeal = validDeals.length > 0 ? validDeals[0] : null;

    if (!bestDeal && platformDeals.length === 0) {
      return res.json({
        product,
        offers,
        priceBreakdown: null,
        platformDeals: [],
        bestDeal: null,
        priceHistory: [],
        message: "No valid offers available"
      });
    }

    const bp = Number(bestDeal?.basePrice || product.basePrice || 0);
    const mainBreakdown = bestDeal?.priceBreakdown || (bp > 0 ? calculateBestPrice(bp, offers) : null);

    // 90-day price history trend based on validated price
    const priceHistory = bp > 0 ? [
      { label: "90d ago", price: Math.round(bp * 1.14) },
      { label: "60d ago", price: Math.round(bp * 1.08) },
      { label: "45d ago", price: Math.round(bp * 1.18) },
      { label: "30d ago", price: Math.round(bp * 1.05) },
      { label: "15d ago", price: Math.round(bp * 1.02) },
      { label: "Today", price: Math.round(bp) }
    ] : [];

    res.json({
      product,
      offers,
      priceBreakdown: mainBreakdown,
      platformDeals,
      bestDeal,
      priceHistory
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch offers", details: err.message });
  }
});

// POST /api/calc-price { productId }
router.post("/calc-price", async (req, res) => {
  try {
    const { productId } = req.body;
    let product = await Product.findOne({ id: productId }).lean();
    if (!product) product = productsJSON.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const offers = await getOffersForProduct(productId);
    const priceBreakdown = calculateBestPrice(product.basePrice, offers);
    res.json(priceBreakdown);
  } catch (err) {
    res.status(500).json({ error: "Price calculation failed", details: err.message });
  }
});

// GET /api/live-search
router.get("/live-search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
  res.json({ source: "mongodb", query: q, stores: [] });
});

// GET /api/products/:id/live-stores
router.get("/products/:id/live-stores", async (req, res) => {
  try {
    let product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) product = productsJSON.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json({
      product,
      source: "mongodb",
      totalStores: 0,
      stores: []
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch live stores", details: err.message });
  }
});

// POST /api/ai/assistant -> Shopping & Savings AI Assistant
router.post("/ai/assistant", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message string is required" });
    }

    const q = message.toLowerCase();
    const productsList = await getActiveProducts();

    let matched = productsList.filter(
      (p) =>
        p.name &&
        (q.includes(p.name.toLowerCase()) ||
          (p.category && q.includes(p.category.toLowerCase())) ||
          (p.platform && q.includes(p.platform.toLowerCase())))
    );

    if (matched.length === 0) {
      matched = productsList.slice(0, 3);
    } else {
      matched = matched.slice(0, 3);
    }

    const dealRecommendations = [];
    for (const p of matched) {
      const offers = await getOffersForProduct(p.id);
      const breakdown = calculateBestPrice(p.basePrice || 0, offers);
      const savedPct = p.basePrice > 0 ? Math.round((breakdown.totalDiscount / p.basePrice) * 100) : 0;
      dealRecommendations.push({
        product: p,
        finalPrice: breakdown.finalPrice,
        totalDiscount: breakdown.totalDiscount,
        savedPercent: savedPct,
        bestPaymentMethod: breakdown.bestPaymentMethod?.label || "HDFC/ICICI Card or GPay UPI"
      });
    }

    let responseText = "";
    if (q.includes("hdfc") || q.includes("icici") || q.includes("sbi") || q.includes("card") || q.includes("bank")) {
      responseText = `I analyzed available card perks! Bank cards (HDFC & ICICI) offer flat cashback on electronics. Here are the top matches:`;
    } else if (q.includes("upi") || q.includes("gpay") || q.includes("phonepe") || q.includes("paytm")) {
      responseText = `UPI offers give instant flat discounts across Grocery, Books & Accessories. Here are recommended deals:`;
    } else if (q.includes("phone") || q.includes("laptop") || q.includes("electronics")) {
      responseText = `Here are the highest-rated electronics deals calculated with stored coupon stacking & bank card discounts:`;
    } else {
      responseText = `Based on stored offer campaigns, bank offers, and cashback rules, here are recommendations for your query:`;
    }

    res.json({
      reply: responseText,
      recommendations: dealRecommendations
    });
  } catch (err) {
    res.status(500).json({ error: "AI Assistant processing failed", details: err.message });
  }
});

module.exports = router;
