require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product");
const Offer = require("../models/offer");
const { validateRow, cleanRow, ingestItems } = require("../services/ingestionService");

async function runFullTestSuite() {
  console.log("=========================================");
  console.log("CLAIMPERKS INGESTION & DATA FLOW QA SUITE");
  console.log("=========================================\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Validation Unit Tests
  const invalidRow1 = validateRow({});
  assert(invalidRow1.length >= 2, "Validation rejects empty object with missing name and price");

  const invalidRow2 = validateRow({ product_name: "Test", price: "abc" });
  assert(invalidRow2.includes("Price must be a valid number"), "Validation rejects non-numeric price");

  const invalidRow3 = validateRow({ product_name: "Test", price: -50 });
  assert(invalidRow3.includes("Price must be greater than 0"), "Validation rejects negative price");

  const validRow = validateRow({ product_name: "Apple iPhone 15", price: 55999 });
  assert(validRow.length === 0, "Validation accepts valid row");

  // 2. Cleaning Unit Tests
  const cleaned = cleanRow({
    product_name: "  Apple iPhone 15  ",
    price: "55999",
    vendor: " Amazon ",
    url: " https://www.amazon.in/dp/B0CHX6869V ",
    affiliateUrl: "null",
    brand: "Apple",
    model: "iPhone 15"
  });

  assert(cleaned.product_name === "Apple iPhone 15", "Cleaned product_name trimmed");
  assert(cleaned.price === 55999, "Cleaned price parsed as float");
  assert(cleaned.vendor === "Amazon", "Cleaned vendor trimmed");
  assert(cleaned.url === "https://www.amazon.in/dp/B0CHX6869V", "Cleaned URL preserved, 'null' string ignored");

  // 3. Manual / CSV Ingestion Integration Test
  console.log("\nTesting Manual / CSV Ingestion to MongoDB...");

  const testIngestionItems = [
    {
      product_name: "Apple iPhone 15",
      vendor: "Amazon",
      price: 55999,
      url: "https://www.amazon.in/dp/B0CHX6869V?tag=claimperks-21",
      storage: "128gb",
      brand: "Apple"
    },
    {
      product_name: "Apple iPhone 15",
      vendor: "Flipkart",
      price: 55900,
      url: "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4",
      storage: "128gb",
      brand: "Apple"
    },
    {
      product_name: "Apple iPhone 15 256GB",
      vendor: "Croma",
      price: 65990,
      url: "https://www.croma.com/apple-iphone-15-256gb-black/p/301123",
      storage: "256gb",
      brand: "Apple"
    }
  ];

  const ingestRes = await ingestItems(testIngestionItems);
  assert(ingestRes.successfulRows === 3, "Ingested 3 test items successfully");
  assert(ingestRes.failedRows === 0, "No failed rows during valid ingestion");

  // Verify MongoDB Offer collection state
  const amazonOffer = await Offer.findOne({ productId: "p1", vendor: "Amazon" });
  assert(amazonOffer !== null && amazonOffer.price === 55999, "Amazon Offer stored in MongoDB with exact price 55999");
  assert(amazonOffer.url === "https://www.amazon.in/dp/B0CHX6869V?tag=claimperks-21", "Amazon Offer URL stored in MongoDB");

  const flipkartOffer = await Offer.findOne({ productId: "p1", vendor: "Flipkart" });
  assert(flipkartOffer !== null && flipkartOffer.price === 55900, "Flipkart Offer stored in MongoDB with exact price 55900 without overwriting Amazon");

  // Verify Variant Distinction
  const offersForP1 = await Offer.find({ productId: "p1" });
  assert(offersForP1.length >= 2, "Multi-vendor offers exist for p1 (iPhone 15 128GB)");

  // 4. Catalog Audit & Verification
  const allProducts = await Product.find({});
  const allOffers = await Offer.find({});

  console.log(`\nCatalog Audit: ${allProducts.length} Products, ${allOffers.length} Offers in MongoDB.`);

  let invalidPrices = 0;
  let invalidUrls = 0;

  for (const o of allOffers) {
    if (o.price !== undefined && o.price !== null && (isNaN(Number(o.price)) || Number(o.price) <= 0)) {
      invalidPrices++;
    }
    if (o.url && (o.url === "null" || o.url === "undefined")) {
      invalidUrls++;
    }
  }

  assert(invalidPrices === 0, `0 invalid offer prices found in MongoDB (Actual: ${invalidPrices})`);
  assert(invalidUrls === 0, `0 'null'/'undefined' string URLs found in MongoDB (Actual: ${invalidUrls})`);

  console.log("\n=========================================");
  console.log(`QA SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFullTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
