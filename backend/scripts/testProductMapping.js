/**
 * backend/scripts/testProductMapping.js
 * Automated Test Suite for Product Mapping Layer
 */

const {
  normalizeProduct,
  extractProductAttributes,
  generateProductKey,
  findProductMatch
} = require("../services/productMappingService");

const sampleCatalog = [
  {
    id: "p1",
    name: "Apple iPhone 15",
    brand: "Apple",
    model: "iPhone 15",
    storage: "128gb",
    category: "Electronics",
    basePrice: 70184,
    sku: "IPH15-128-BLK",
    gtin: "194253000001"
  },
  {
    id: "p2",
    name: "Apple iPhone 15 Pro",
    brand: "Apple",
    model: "iPhone 15 Pro",
    storage: "256gb",
    category: "Electronics",
    basePrice: 76983,
    sku: "IPH15P-256-TI",
    gtin: "194253000002"
  },
  {
    id: "p3",
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    storage: "256gb",
    category: "Electronics",
    basePrice: 129999,
    sku: "SAM-S24U-256",
    gtin: "880609000003"
  },
  {
    id: "p4",
    name: "Samsung Galaxy A55",
    brand: "Samsung",
    model: "Galaxy A55",
    storage: "128gb",
    category: "Electronics",
    basePrice: 37740,
    sku: "SAM-A55-128",
    gtin: "880609000004"
  },
  {
    id: "p5",
    name: "Samsung Galaxy A35",
    brand: "Samsung",
    model: "Galaxy A35",
    storage: "128gb",
    category: "Electronics",
    basePrice: 30999,
    sku: "SAM-A35-128",
    gtin: "880609000005"
  }
];

function runTests() {
  console.log("=========================================");
  console.log("PRODUCT MAPPING LAYER VERIFICATION SUITE");
  console.log("=========================================\n");

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

  // 1. Exact SKU / GTIN Match
  const test1 = findProductMatch(
    { name: "Unknown External Title", gtin: "194253000001", source: "Cuelinks" },
    sampleCatalog
  );
  assert(test1.matched === true && test1.productId === "p1" && test1.confidence === 1.0, "Test 1: Exact GTIN match maps to p1 with 1.0 confidence");

  // 2. Same Samsung product with different naming format
  const test2 = findProductMatch(
    { name: "Samsung S24 Ultra 5G (Titanium Black, 256 GB)", source: "Amazon" },
    sampleCatalog
  );
  assert(test2.matched === true && test2.productId === "p3" && test2.confidence >= 0.85, "Test 2: Samsung Galaxy S24 Ultra alternate naming maps to p3");

  // 3. Different storage variants
  const test3 = findProductMatch(
    { name: "Apple iPhone 15 512GB Blue", source: "Flipkart" },
    sampleCatalog
  );
  assert(test3.matched === false && test3.status !== "matched", "Test 3: Different storage variant (512GB vs 128GB) prevents false exact match to p1");

  // 4. Different products with similar names (Galaxy A55 vs Galaxy A35)
  const test4 = findProductMatch(
    { name: "Samsung Galaxy A55 5G 128GB", source: "Croma" },
    sampleCatalog
  );
  assert(test4.matched === true && test4.productId === "p4", "Test 4: Galaxy A55 maps to p4 and does NOT confuse with A35");

  // 5. Completely new product
  const test5 = findProductMatch(
    { name: "Dyson V15 Detect Vacuum Cleaner", source: "Cuelinks" },
    sampleCatalog
  );
  assert(test5.matched === false && test5.status === "no_match" && test5.productId === null, "Test 5: Completely new product returns status 'no_match' and productId null");

  // 6. Missing brand / model
  const test6 = findProductMatch(
    { name: "Wireless Bluetooth Earbuds Pro", source: "Generic" },
    sampleCatalog
  );
  assert(test6.matched === false && test6.status === "no_match", "Test 6: Missing brand/model generic string returns status 'no_match'");

  console.log("\n=========================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
