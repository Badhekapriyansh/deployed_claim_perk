const productMappingService = require("./productMappingService");
const Product = require("../models/product");
const Offer = require("../models/offer");

/**
 * Validates a single row/item of ingestion data.
 */
const validateRow = (row) => {
  const errors = [];
  if (!row || typeof row !== "object") {
    errors.push("Invalid record format");
    return errors;
  }

  const rawName = row.product_name || row.name || row.title;
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name || name.toLowerCase() === "null" || name.toLowerCase() === "undefined") {
    errors.push("Missing or invalid required field: product_name (or name)");
  }

  if (row.price === undefined || row.price === null || row.price === "") {
    errors.push("Missing required field: price");
  } else {
    const numericPrice = Number(row.price);
    if (isNaN(numericPrice)) {
      errors.push("Price must be a valid number");
    } else if (numericPrice <= 0) {
      errors.push("Price must be greater than 0");
    }
  }

  return errors;
};

/**
 * Cleans and normalizes a single row/item.
 */
const cleanRow = (row) => {
  const rawName = row.product_name || row.name || row.title || "";
  const name = String(rawName).trim();
  const price = parseFloat(row.price);

  const rawVendor = row.vendor || row.merchant || "";
  const vendorStr = String(rawVendor).trim();
  const vendor = vendorStr && vendorStr.toLowerCase() !== "null" && vendorStr.toLowerCase() !== "undefined"
    ? vendorStr
    : "Unknown Vendor";

  // Sanitize helper for optional string attributes
  const sanitizeAttr = (val) => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
      return undefined;
    }
    return str;
  };

  // URL priority: affiliateUrl -> url -> productUrl -> link
  const rawAffiliate = sanitizeAttr(row.affiliateUrl);
  const rawUrl = sanitizeAttr(row.url);
  const rawProductUrl = sanitizeAttr(row.productUrl);
  const rawLink = sanitizeAttr(row.link);

  const primaryUrl = rawAffiliate || rawUrl || rawProductUrl || rawLink || undefined;

  const cleaned = {
    ...row,
    product_name: name,
    name: name,
    price: price,
    vendor: vendor,
    brand: sanitizeAttr(row.brand),
    model: sanitizeAttr(row.model),
    storage: sanitizeAttr(row.storage),
    ram: sanitizeAttr(row.ram),
    color: sanitizeAttr(row.color),
    condition: sanitizeAttr(row.condition),
    sku: sanitizeAttr(row.sku),
    ean: sanitizeAttr(row.ean),
    gtin: sanitizeAttr(row.gtin),
    category: sanitizeAttr(row.category),
    image: sanitizeAttr(row.image),
    url: primaryUrl,
    affiliateUrl: rawAffiliate || primaryUrl,
    productUrl: rawProductUrl || primaryUrl
  };

  // Remove undefined or empty string values
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === "") {
      delete cleaned[key];
    }
  });

  return cleaned;
};

/**
 * Generates next available Product ID (e.g. p133, p134...)
 */
const generateNextProductId = async () => {
  const existingProducts = await Product.find({}).select("id").lean();
  let maxId = 0;
  for (const p of existingProducts) {
    if (p.id && p.id.startsWith("p")) {
      const num = parseInt(p.id.substring(1), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  return `p${maxId + 1}`;
};

/**
 * Ingests an array of items (CSV rows or manual entries).
 */
const ingestItems = async (items) => {
  const result = {
    totalRows: items.length,
    successfulRows: 0,
    failedRows: 0,
    matchedProducts: [],
    reviewRequired: [],
    newProducts: [],
    errors: []
  };

  // Fetch current catalog from MongoDB for matching
  const catalogProducts = await Product.find({}).lean();

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];

    // 1. Validation
    const validationErrors = validateRow(rawItem);
    if (validationErrors.length > 0) {
      result.errors.push({ index: i, item: rawItem, errors: validationErrors });
      result.failedRows++;
      continue;
    }

    // 2. Cleaning
    const cleanedItem = cleanRow(rawItem);

    try {
      // 3. Match against existing product catalog using UNTOUCHED productMappingService
      const mappingResult = productMappingService.findProductMatch(cleanedItem, catalogProducts);

      if (mappingResult.status === "matched") {
        const productId = mappingResult.productId;
        const vendor = cleanedItem.vendor;

        // Upsert offer using compound key { productId, vendor }
        await Offer.findOneAndUpdate(
          { productId, vendor },
          { $set: { ...cleanedItem, productId, vendor, updatedFromIngestion: true } },
          { upsert: true, new: true }
        );

        // Ensure product in MongoDB has non-null properties if updated
        await Product.findOneAndUpdate(
          { id: productId },
          { $setOnInsert: { id: productId, name: cleanedItem.product_name, category: cleanedItem.category || "General", basePrice: cleanedItem.price, createdFromIngestion: true } },
          { upsert: true }
        );

        result.matchedProducts.push({ index: i, item: cleanedItem, productId, vendor });
        result.successfulRows++;

      } else if (mappingResult.status === "review_required") {
        result.reviewRequired.push({
          index: i,
          item: cleanedItem,
          suggestedProductId: mappingResult.suggestedProductId,
          confidence: mappingResult.confidence,
          matchedBy: mappingResult.matchedBy
        });
      } else if (mappingResult.status === "no_match") {
        // Create new product if no match found
        const newId = await generateNextProductId();
        const newProductData = {
          id: newId,
          name: cleanedItem.product_name,
          category: cleanedItem.category || "General",
          image: cleanedItem.image || "📦",
          platform: cleanedItem.vendor,
          basePrice: cleanedItem.price,
          brand: cleanedItem.brand,
          model: cleanedItem.model,
          storage: cleanedItem.storage,
          ram: cleanedItem.ram,
          color: cleanedItem.color,
          sku: cleanedItem.sku,
          gtin: cleanedItem.gtin,
          createdFromIngestion: true
        };

        const newProdDoc = await Product.create(newProductData);
        catalogProducts.push(newProdDoc.toObject());

        await Offer.findOneAndUpdate(
          { productId: newId, vendor: cleanedItem.vendor },
          { $set: { ...cleanedItem, productId: newId, vendor: cleanedItem.vendor, updatedFromIngestion: true } },
          { upsert: true, new: true }
        );

        result.newProducts.push({ index: i, item: cleanedItem, productId: newId });
        result.successfulRows++;
      } else {
        throw new Error(`Unknown mapping status: ${mappingResult.status}`);
      }
    } catch (err) {
      result.errors.push({ index: i, item: rawItem, errors: [err.message] });
      result.failedRows++;
    }
  }

  return result;
};

module.exports = {
  validateRow,
  cleanRow,
  ingestItems
};
