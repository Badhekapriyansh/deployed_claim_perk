/**
 * backend/services/productMappingService.js
 * Rule-based External Product Mapping Layer for Claim Perks.
 * 
 * Maps incoming merchant/affiliate/Cuelinks products to existing Claim Perks product IDs (e.g. p1, p2)
 * using attribute extraction, token normalization, exact barcode/SKU matching, and string similarity scoring.
 */

const KNOWN_BRANDS = [
  "Apple", "Samsung", "Sony", "OnePlus", "Xiaomi", "Realme", "Vivo", "Oppo",
  "Dell", "HP", "Lenovo", "Asus", "Acer", "boAt", "JBL", "Noise", "Boult",
  "Canon", "Fujifilm", "Logitech", "Razer", "Nike", "Adidas", "Puma", "Reebok",
  "Bata", "Woodland", "Zara", "H&M", "Levi's", "Van Heusen", "Allen Solly",
  "Fabindia", "Biba", "W for Woman", "Caprese", "Baggit", "Wildcraft",
  "American Tourister", "Fossil", "Titan", "Fastrack", "Instant Pot", "Prestige",
  "Philips", "Bajaj", "Wonderchef", "Milton", "IKEA", "Nilkamal", "Godrej",
  "Havells", "Hindware", "Butterfly", "Cello", "Bombay Dyeing", "Dyson"
];

const KNOWN_COLORS = [
  "black", "white", "blue", "green", "red", "yellow", "purple", "pink",
  "titanium", "gold", "silver", "space grey", "space gray", "midnight",
  "starlight", "natural titanium", "desert titanium", "navy", "grey", "gray"
];

/**
 * 1. normalizeProduct(rawTextOrObject)
 * Clean, lowercase, and normalize product name and units.
 */
function normalizeProduct(input) {
  if (!input) return "";
  let text = typeof input === "string" ? input : input.name || input.title || "";
  if (typeof text !== "string") return "";

  let str = text.toLowerCase();

  // Standardize memory / storage units (e.g. "128 gb", "128-gb", "128g" -> "128gb")
  str = str.replace(/\b(\d+)\s*(gb|tb|mb)\b/gi, "$1$2");
  str = str.replace(/\b(\d+)\s*(kg|g|ml|l)\b/gi, "$1$2");

  // Standardize 5G / 4G
  str = str.replace(/\b(5\s*g)\b/gi, "5g");
  str = str.replace(/\b(4\s*g)\b/gi, "4g");

  // Replace punctuation and special characters with spaces
  str = str.replace(/[^a-z0-9\s]/g, " ");

  // Normalize spaces
  str = str.replace(/\s+/g, " ").trim();

  return str;
}

/**
 * Extract model core tokens (strips common noise like 5g, colors, accessories)
 */
function getCoreModelTokens(normalizedStr, brand) {
  let str = normalizedStr;
  if (brand) {
    str = str.replace(brand.toLowerCase(), "");
  }
  // Strip common noise words
  str = str.replace(/\b(5g|4g|smartphone|mobile|phone|ram|rom|storage|gb|tb|black|white|blue|green|red|titanium|gold|silver|grey|gray|midnight|starlight)\b/g, "");
  str = str.replace(/\b(\d+gb|\d+tb)\b/g, "");

  return str.split(" ").filter((t) => t.length > 0);
}

/**
 * 2. extractProductAttributes(input)
 * Extract key product fields (brand, model, storage, RAM, color, category, SKU/EAN/GTIN).
 */
function extractProductAttributes(input) {
  const text = typeof input === "string" ? input : (input.name || input.title || "");
  const obj = typeof input === "object" && input !== null ? input : {};

  const normalized = normalizeProduct(text);

  // Extract Brand
  let brand = obj.brand || null;
  if (!brand) {
    for (const b of KNOWN_BRANDS) {
      const bLower = b.toLowerCase();
      if (normalized.startsWith(bLower) || normalized.includes(` ${bLower} `) || normalized.endsWith(` ${bLower}`)) {
        brand = b;
        break;
      }
    }
  }
  if (!brand && normalized) {
    // Fallback: first word
    const firstWord = text.trim().split(" ")[0];
    if (firstWord && firstWord.length > 1) {
      brand = firstWord;
    }
  }

  // Extract Storage (e.g. 128gb, 256gb, 512gb, 1tb)
  let storage = obj.storage || null;
  if (!storage) {
    const storageMatch = normalized.match(/\b(32gb|64gb|128gb|256gb|512gb|1tb|2tb)\b/i);
    if (storageMatch) storage = storageMatch[1].toLowerCase();
  }

  // Extract RAM (e.g. 4gb, 6gb, 8gb, 12gb, 16gb ram)
  let ram = obj.ram || null;
  if (!ram) {
    const ramMatch = text.toLowerCase().match(/\b(2gb|3gb|4gb|6gb|8gb|12gb|16gb|24gb)\s*(ram|memory)?\b/i);
    if (ramMatch && (!storage || ramMatch[1].toLowerCase() !== storage)) {
      ram = ramMatch[1].toLowerCase();
    }
  }

  // Extract Color
  let color = obj.color || null;
  if (!color) {
    for (const c of KNOWN_COLORS) {
      if (normalized.includes(c)) {
        color = c;
        break;
      }
    }
  }

  // Extract Category
  let category = obj.category || null;
  if (!category) {
    if (/phone|iphone|galaxy|smartphone|mobile|redmi|oneplus|realme|vivo|oppo/i.test(text)) {
      category = "Electronics";
    } else if (/shoe|sneaker|nike|adidas|puma|bata|woodland/i.test(text)) {
      category = "Footwear";
    } else if (/shirt|jeans|t-shirt|zara|h&m|levi|dress/i.test(text)) {
      category = "Fashion";
    } else if (/headphone|earbuds|earphone|boat|jbl|noise|audio/i.test(text)) {
      category = "Electronics";
    } else if (/laptop|computer|macbook|dell|hp|lenovo|asus/i.test(text)) {
      category = "Electronics";
    }
  }

  // Extract Identifiers
  const sku = obj.sku || obj.merchantProductId || null;
  const ean = obj.ean || null;
  const gtin = obj.gtin || obj.upc || null;

  // Extract Model Name
  let model = obj.model || null;
  if (!model && brand && normalized) {
    const bLower = brand.toLowerCase();
    let remaining = normalized.replace(bLower, "").trim();
    if (storage) remaining = remaining.replace(storage, "");
    if (ram) remaining = remaining.replace(ram, "");
    if (color) remaining = remaining.replace(color, "");
    remaining = remaining.replace(/\b(ram|rom|5g|4g|smartphone|mobile|phone|black|white|blue|green|red|titanium)\b/g, "");
    model = remaining.replace(/\s+/g, " ").trim();
  }

  return {
    rawName: text,
    normalized,
    brand,
    model,
    storage,
    ram,
    color,
    category,
    sku,
    ean,
    gtin
  };
}

/**
 * 3. generateProductKey(input)
 * Generate a canonical matching key based on brand, model, and storage.
 */
function generateProductKey(input) {
  const attrs = typeof input === "object" && input.normalized ? input : extractProductAttributes(input);
  const brandToken = (attrs.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const modelToken = (attrs.model || attrs.normalized || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const storageToken = attrs.storage || "";

  return `${brandToken}:${modelToken}:${storageToken}`;
}

/**
 * 4. findProductMatch(incomingProduct, catalogProducts)
 * Main mapping function to match an incoming product to the existing catalog.
 */
function findProductMatch(incomingProduct, catalogProducts = []) {
  const incomingAttrs = extractProductAttributes(incomingProduct);

  const merchantDetails = {
    source: incomingProduct.source || incomingProduct.platform || null,
    merchant: incomingProduct.merchant || incomingProduct.platform || null,
    merchantProductId: incomingProduct.merchantProductId || incomingProduct.id || null,
    sku: incomingAttrs.sku,
    ean: incomingAttrs.ean,
    gtin: incomingAttrs.gtin,
    productUrl: incomingProduct.productUrl || incomingProduct.affiliateUrl || incomingProduct.url || null
  };

  let bestMatch = null;
  let maxScore = 0;
  let matchReason = "none";

  for (const item of catalogProducts) {
    const catalogAttrs = extractProductAttributes(item);

    // Rule A: Exact Barcode / SKU / GTIN match (Score = 1.0)
    if (
      (incomingAttrs.gtin && catalogAttrs.gtin && incomingAttrs.gtin === catalogAttrs.gtin) ||
      (incomingAttrs.ean && catalogAttrs.ean && incomingAttrs.ean === catalogAttrs.ean) ||
      (incomingAttrs.sku && catalogAttrs.sku && incomingAttrs.sku === catalogAttrs.sku)
    ) {
      return {
        matched: true,
        status: "matched",
        productId: item.id,
        confidence: 1.0,
        matchedBy: "exact_identifier",
        attributes: incomingAttrs,
        candidate: item,
        merchantDetails
      };
    }

    // Rule B: Brand mismatch check -> if brands are completely different, skip
    if (
      incomingAttrs.brand &&
      catalogAttrs.brand &&
      incomingAttrs.brand.toLowerCase() !== catalogAttrs.brand.toLowerCase()
    ) {
      continue;
    }

    // Rule C: Storage mismatch penalty
    if (
      incomingAttrs.storage &&
      catalogAttrs.storage &&
      incomingAttrs.storage !== catalogAttrs.storage
    ) {
      continue;
    }

    // Core Model Token Match
    const inModelTokens = getCoreModelTokens(incomingAttrs.normalized, incomingAttrs.brand);
    const catModelTokens = getCoreModelTokens(catalogAttrs.normalized, catalogAttrs.brand);

    let matchCount = 0;
    for (const token of inModelTokens) {
      // Ignore optional series word "galaxy" if model numbers match
      if (catModelTokens.includes(token)) {
        matchCount++;
      }
    }

    const minTokens = Math.min(inModelTokens.length, catModelTokens.length);
    let modelScore = minTokens > 0 ? matchCount / minTokens : 0;

    // Check key model numbers (e.g. s24, a55, a35, 15, pro)
    const inNumbers = incomingAttrs.normalized.match(/\b([a-z]?\d+[a-z]?|pro|ultra|max|mini|plus)\b/gi) || [];
    const catNumbers = catalogAttrs.normalized.match(/\b([a-z]?\d+[a-z]?|pro|ultra|max|mini|plus)\b/gi) || [];

    const numMatch = inNumbers.every((n) => catNumbers.includes(n));
    const numMismatch = catNumbers.some((n) => (n === "pro" || n === "ultra" || n === "max" || n === "mini" || n === "plus" || /\d+/.test(n)) && !inNumbers.includes(n));

    if (numMismatch) {
      continue;
    }

    let finalScore = modelScore;

    // High confidence if brand matches and all core model numbers match
    if (incomingAttrs.brand && catalogAttrs.brand && incomingAttrs.brand.toLowerCase() === catalogAttrs.brand.toLowerCase() && numMatch && inNumbers.length > 0) {
      finalScore = Math.max(finalScore, 0.90);
    }

    if (finalScore > maxScore) {
      maxScore = finalScore;
      bestMatch = item;
      matchReason = finalScore >= 0.85 ? "brand_model_attributes" : "partial_attributes";
    }
  }

  const confidence = Math.round(maxScore * 100) / 100;

  if (confidence >= 0.85 && bestMatch) {
    return {
      matched: true,
      status: "matched",
      productId: bestMatch.id,
      confidence,
      matchedBy: matchReason,
      attributes: incomingAttrs,
      candidate: bestMatch,
      merchantDetails
    };
  } else if (confidence >= 0.65 && bestMatch) {
    return {
      matched: false,
      status: "review_required",
      productId: null,
      suggestedProductId: bestMatch.id,
      confidence,
      matchedBy: "partial_attributes",
      attributes: incomingAttrs,
      candidate: bestMatch,
      merchantDetails
    };
  } else {
    return {
      matched: false,
      status: "no_match",
      productId: null,
      confidence,
      matchedBy: "none",
      attributes: incomingAttrs,
      candidate: null,
      merchantDetails
    };
  }
}

module.exports = {
  normalizeProduct,
  extractProductAttributes,
  generateProductKey,
  findProductMatch
};
