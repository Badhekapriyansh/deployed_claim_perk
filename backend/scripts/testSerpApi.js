require("dotenv").config();
const { searchLivePrices } = require("../utils/serpApiService");

async function test() {
  console.log("Testing SerpApi Integration with configured API key...");
  const query = "Sony WH-1000XM5";
  const result = await searchLivePrices(query);

  if (result.error) {
    console.error("❌ Test Failed:", result.error);
  } else {
    console.log(`✅ Test Successful! Found ${result.totalStoresFound} stores for "${query}":\n`);
    if (result.cheapestStore) {
      console.log(`🏆 Cheapest Store: ${result.cheapestStore.storeName} @ ${result.cheapestStore.price}`);
    }
    console.log("\nTop 5 Stores Found:");
    result.stores.slice(0, 5).forEach((s, i) => {
      console.log(`${i + 1}. ${s.storeName} - ${s.price} (${s.title.slice(0, 45)}...)`);
    });
  }
}

test();
