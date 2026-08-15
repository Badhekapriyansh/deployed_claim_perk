const productMappingService = require("./productMappingService");
const Product = require("../models/product");
const Offer = require("../models/offer");

/**
 * Validates a single row/item of ingestion data.
 */
const validateRow = (row) => {
  const errors = [];
  const name = row.product_name || row.name;
  if (!name) errors.push("Missing required field: product_name (or name)");
  if (!row.price) errors.push("Missing required field: price");
  if (row.price && isNaN(Number(row.price))) errors.push("Price must be a valid number");
  return errors;
};

/**
 * Cleans and normalizes a single row/item.
 */
const cleanRow = (row) => {
  const name = (row.product_name || row.name || "").trim();
  const price = parseFloat(row.price);
  const vendor = (row.vendor || "").trim() || "Unknown Vendor";

  // Create a normalized object
  const cleaned = {
    ...row,
    product_name: name,
    price: price,
    vendor: vendor,
    url: (row.url || "").trim()
  };

  // Remove empty string fields
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === "") delete cleaned[key];
  });

  return cleaned;
};

/**
 * Ingests an array of items (CSV rows or manual entries).
 */
const ingestItems = async (items) => {
  const result = {
    totalProcessed: items.length,
    successCount: 0,
    failedCount: 0,
    matched: [],
    reviewRequired: [],
    newProducts: [],
    errors: []
  };

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];

    // 1. Validation
    const validationErrors = validateRow(rawItem);
    if (validationErrors.length > 0) {
      result.errors.push({ index: i, item: rawItem, errors: validationErrors });
      result.failedCount++;
      continue;
    }

    // 2. Cleaning
    const cleanedItem = cleanRow(rawItem);

    try {
      // 3. Product Mapping Service
      const mappingResult = await productMappingService.mapProduct(cleanedItem);

      if (mappingResult.status === "matched") {
        // 4. Persistence
        const productId = mappingResult.productId;
        const vendor = cleanedItem.vendor || "Unknown Vendor";

        // Upsert offer using BOTH productId and vendor
        await Offer.findOneAndUpdate(
          { productId, vendor },
          { $set: { ...cleanedItem, productId, vendor, updatedFromIngestion: true } },
          { upsert: true, new: true }
        );

        // Optionally upsert product if it doesn't exist yet
        await Product.findOneAndUpdate(
          { id: productId },
          { $setOnInsert: { id: productId, name: cleanedItem.product_name, createdFromIngestion: true } },
          { upsert: true }
        );

        result.matched.push({ index: i, item: cleanedItem, productId, vendor });
        result.successCount++;

      } else if (mappingResult.status === "review_required") {
        // Do not silently create duplicate
        result.reviewRequired.push({ index: i, item: cleanedItem, reason: mappingResult.reason });
      } else if (mappingResult.status === "no_match") {
        // Return structured result indicating new product requires review/creation
        result.newProducts.push({ index: i, item: cleanedItem });
      } else {
        throw new Error(`Unknown mapping status: ${mappingResult.status}`);
      }
    } catch (err) {
      result.errors.push({ index: i, item: rawItem, errors: [err.message] });
      result.failedCount++;
    }
  }

  return result;
};

module.exports = {
  validateRow,
  cleanRow,
  ingestItems
};
