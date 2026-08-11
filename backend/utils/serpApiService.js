// backend/utils/serpApiService.js

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache to save SerpApi credits

/**
 * Searches Google Shopping via SerpApi for live price comparison across online stores.
 * @param {string} query - Product name or search term
 * @returns {Promise<Object>} Stores comparison data
 */
async function searchLivePrices(query) {
  if (!query || typeof query !== "string") {
    return { error: "Query is required" };
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey || apiKey.includes("your_actual_serpapi_key")) {
    return { error: "SerpApi key is missing or invalid in backend/.env" };
  }

  const cacheKey = query.trim().toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[SerpApi] Returning cached result for "${query}"`);
    return cached.data;
  }

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.append("engine", "google_shopping");
    url.searchParams.append("q", query);
    url.searchParams.append("gl", "in"); // India region (adjust if needed)
    url.searchParams.append("hl", "en");
    url.searchParams.append("api_key", apiKey);

    console.log(`[SerpApi] Requesting live prices for "${query}"...`);
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error("[SerpApi] Error:", data.error);
      return { error: data.error };
    }

    const rawResults = data.shopping_results || [];

    // Group and structure store pricing results
    const stores = rawResults.map((item, index) => {
      const storeName = item.source || "Online Merchant";
      const rawPrice = item.extracted_price || 0;
      const formattedPrice = item.price || (rawPrice ? `₹${rawPrice.toLocaleString("en-IN")}` : "N/A");

      return {
        id: `serp-${index}-${Date.now()}`,
        title: item.title,
        storeName,
        price: formattedPrice,
        basePrice: rawPrice,
        url: item.link || item.product_link || "#",
        thumbnail: item.thumbnail,
        rating: item.rating || null,
        reviews: item.reviews || 0,
        delivery: item.delivery || "Standard Shipping"
      };
    });

    // Find the cheapest store by base price
    const validStores = stores.filter(s => s.basePrice > 0);
    validStores.sort((a, b) => a.basePrice - b.basePrice);

    const cheapestStore = validStores[0] || null;

    const result = {
      query,
      timestamp: new Date().toISOString(),
      totalStoresFound: stores.length,
      cheapestStore,
      stores
    };

    // Cache the result
    cache.set(cacheKey, { timestamp: Date.now(), data: result });

    return result;
  } catch (err) {
    console.error("[SerpApi] Fetch exception:", err.message);
    return { error: err.message || "Failed to query SerpApi" };
  }
}

module.exports = { searchLivePrices };
