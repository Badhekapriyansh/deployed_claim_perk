require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");
const http = require("http");

const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

const BASE_URL = "http://127.0.0.1:5000";

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("COMPREHENSIVE END-TO-END VERIFICATION TEST SUITE");
  console.log("=================================================");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      testsFailed++;
    }
  }

  try {
    // 1. MongoDB & Env Config Verification
    assert(!!process.env.JWT_SECRET, "MongoDB & JWT env: JWT_SECRET is set in process.env");
    assert(process.env.JWT_SECRET === JWT_SECRET, "MongoDB & JWT env: JWT_SECRET loaded correctly in config");
    assert(!!JWT_EXPIRES_IN, "MongoDB & JWT env: JWT_EXPIRES_IN configured");

    // 2. Product Catalog API Endpoints
    const prodRes = await makeRequest("GET", "/api/products?page=1&limit=10&sortBy=price_asc");
    assert(prodRes.status === 200 && Array.isArray(prodRes.body.products) && prodRes.body.products.length > 0, "Products: GET /api/products returns paginated products from MongoDB");
    const sampleProductId = prodRes.body.products[0].id;
    const sampleProduct2Id = prodRes.body.products[1] ? prodRes.body.products[1].id : sampleProductId;

    const catRes = await makeRequest("GET", "/api/categories");
    assert(catRes.status === 200 && Array.isArray(catRes.body.categories), "Products: GET /api/categories returns categories from MongoDB");

    const platRes = await makeRequest("GET", "/api/platforms");
    assert(platRes.status === 200 && Array.isArray(platRes.body.platforms), "Products: GET /api/platforms returns platforms from MongoDB");

    const brandRes = await makeRequest("GET", "/api/brands");
    assert(brandRes.status === 200 && Array.isArray(brandRes.body.brands), "Products: GET /api/brands returns brands from MongoDB");

    const groupedBrandRes = await makeRequest("GET", "/api/brands/grouped");
    assert(groupedBrandRes.status === 200 && Array.isArray(groupedBrandRes.body.brandHubs), "Products: GET /api/brands/grouped returns grouped brand hubs");

    const compareRes = await makeRequest("POST", "/api/products/compare", { productIds: [sampleProductId, sampleProduct2Id] });
    assert(compareRes.status === 200 && Array.isArray(compareRes.body) && compareRes.body.length > 0, "Products: POST /api/products/compare compares products");

    const singleProdRes = await makeRequest("GET", `/api/products/${sampleProductId}`);
    assert(singleProdRes.status === 200 && singleProdRes.body.id === sampleProductId, "Products: GET /api/products/:id fetches single product from MongoDB");

    // 3. Offers & Price Calculator Endpoints
    const offerRes = await makeRequest("GET", `/api/offers/${sampleProductId}`);
    assert(offerRes.status === 200 && !!offerRes.body.priceBreakdown, "Offers: GET /api/offers/:productId returns offer breakdown from MongoDB");

    const calcPriceRes = await makeRequest("POST", "/api/calc-price", { productId: sampleProductId });
    assert(calcPriceRes.status === 200 && typeof calcPriceRes.body.finalPrice === "number", "Offers: POST /api/calc-price calculates best net price");

    // 4. Registration & Login (User Auth)
    const testEmail = `e2e_user_${Date.now()}@example.com`;
    const regRes = await makeRequest("POST", "/api/auth/register", {
      name: "E2E User",
      email: testEmail,
      password: "password123",
      role: "user"
    });
    assert(regRes.status === 201 && !!regRes.body.token, "Auth: POST /api/auth/register creates user in MongoDB and issues JWT");
    assert(!regRes.body.user.passwordHash && !regRes.body.user.password, "Auth: Registration response does NOT expose passwordHash or password");

    const userToken = regRes.body.token;
    const decodedPayload = jwt.decode(userToken);
    assert(decodedPayload.userId === regRes.body.user.id && decodedPayload.role === "user", "JWT: Token payload contains minimal claims (userId, role)");

    // Duplicate Registration
    const dupRes = await makeRequest("POST", "/api/auth/register", {
      name: "Duplicate",
      email: testEmail,
      password: "password123"
    });
    assert(dupRes.status === 409, "Auth: Duplicate email registration returns HTTP 409 Conflict");

    // Login
    const loginRes = await makeRequest("POST", "/api/auth/login", {
      email: testEmail,
      password: "password123"
    });
    assert(loginRes.status === 200 && !!loginRes.body.token, "Auth: POST /api/auth/login succeeds with correct password");
    assert(!loginRes.body.user.passwordHash && !loginRes.body.user.password, "Auth: Login response does NOT expose passwordHash or password");

    // Invalid Login
    const badLoginRes = await makeRequest("POST", "/api/auth/login", {
      email: testEmail,
      password: "wrongpassword"
    });
    assert(badLoginRes.status === 401, "Auth: Login with wrong password returns HTTP 401 Unauthorized");

    // 5. User-Specific Data & Protected CRUD Operations (/api/user/*)
    // Profile
    const meRes = await makeRequest("GET", "/api/user/me", null, userToken);
    assert(meRes.status === 200 && meRes.body.id === regRes.body.user.id, "User Data: GET /api/user/me fetches authenticated user from MongoDB");

    const profileUpdateRes = await makeRequest("PUT", "/api/user/profile", { name: "E2E User Updated", address: "456 Park Ave" }, userToken);
    assert(profileUpdateRes.status === 200 && profileUpdateRes.body.name === "E2E User Updated", "User Data: PUT /api/user/profile updates user details in MongoDB");

    // Favorites CRUD
    const favAddRes = await makeRequest("POST", `/api/user/favorites/${sampleProductId}`, null, userToken);
    assert(favAddRes.status === 200 && favAddRes.body.favorited === true, "User Data: POST /api/user/favorites/:productId adds item to MongoDB favorites");

    const favListRes = await makeRequest("GET", "/api/user/favorites", null, userToken);
    assert(favListRes.status === 200 && favListRes.body.favorites.some((p) => p.id === sampleProductId), "User Data: GET /api/user/favorites fetches populated favorites from MongoDB");

    const favRemoveRes = await makeRequest("POST", `/api/user/favorites/${sampleProductId}`, null, userToken);
    assert(favRemoveRes.status === 200 && favRemoveRes.body.favorited === false, "User Data: POST /api/user/favorites/:productId toggles/removes item from favorites");

    // History CRUD
    const histAddRes = await makeRequest("POST", `/api/user/history/${sampleProductId}`, null, userToken);
    assert(histAddRes.status === 200, "User Data: POST /api/user/history/:productId logs history in MongoDB");

    const histListRes = await makeRequest("GET", "/api/user/history", null, userToken);
    assert(histListRes.status === 200 && histListRes.body.history.length > 0, "User Data: GET /api/user/history fetches viewing history from MongoDB");

    const histItemDeleteRes = await makeRequest("DELETE", `/api/user/history/${sampleProductId}`, null, userToken);
    assert(histItemDeleteRes.status === 200, "User Data: DELETE /api/user/history/:productId removes single item from MongoDB history");

    const histClearRes = await makeRequest("DELETE", "/api/user/history", null, userToken);
    assert(histClearRes.status === 200 && histClearRes.body.history.length === 0, "User Data: DELETE /api/user/history clears viewing history in MongoDB");

    // Redirects CRUD
    const redirectLogRes = await makeRequest("POST", "/api/user/redirects", { productId: sampleProductId, platform: "Amazon" }, userToken);
    assert(redirectLogRes.status === 201 && !!redirectLogRes.body.redirect, "User Data: POST /api/user/redirects logs store jump and awards wallet bonus");

    const redirectListRes = await makeRequest("GET", "/api/user/redirects", null, userToken);
    assert(redirectListRes.status === 200 && redirectListRes.body.redirects.length > 0, "User Data: GET /api/user/redirects fetches redirects from MongoDB");
    const redirectId = redirectListRes.body.redirects[0].id;

    const redirectDeleteRes = await makeRequest("DELETE", `/api/user/redirects/${redirectId}`, null, userToken);
    assert(redirectDeleteRes.status === 200, "User Data: DELETE /api/user/redirects/:id removes single redirect entry");

    const redirectClearRes = await makeRequest("DELETE", "/api/user/redirects", null, userToken);
    assert(redirectClearRes.status === 200 && redirectClearRes.body.redirects.length === 0, "User Data: DELETE /api/user/redirects clears all redirects in MongoDB");

    // Orders CRUD
    const orderCreateRes = await makeRequest("POST", "/api/user/orders", {
      productId: sampleProductId,
      paymentMethod: "UPI",
      shippingAddress: "456 Park Ave",
      cardOrUpi: "user@upi"
    }, userToken);
    assert(orderCreateRes.status === 201 && !!orderCreateRes.body.id, "Orders: POST /api/user/orders creates order in MongoDB user doc and orders collection");

    const orderListRes = await makeRequest("GET", "/api/user/orders", null, userToken);
    assert(orderListRes.status === 200 && orderListRes.body.orders.length > 0, "Orders: GET /api/user/orders fetches user's order history from MongoDB");

    // Wallet & Withdraw
    const walletRes = await makeRequest("GET", "/api/user/wallet", null, userToken);
    assert(walletRes.status === 200 && walletRes.body.wallet.balance > 0, "Wallet: GET /api/user/wallet fetches wallet balance & cashback bonuses");

    const withdrawRes = await makeRequest("POST", "/api/user/wallet/withdraw", { amount: 10, upiId: "user@upi" }, userToken);
    assert(withdrawRes.status === 200 && !!withdrawRes.body.transaction, "Wallet: POST /api/user/wallet/withdraw processes UPI payout in MongoDB");

    // Notifications & Price Alerts
    const notifRes = await makeRequest("GET", "/api/user/notifications", null, userToken);
    assert(notifRes.status === 200 && Array.isArray(notifRes.body.notifications), "User Data: GET /api/user/notifications fetches alerts from MongoDB");

    const alertSubRes = await makeRequest("POST", "/api/user/alerts", { productId: sampleProductId, targetPrice: 50000 }, userToken);
    assert(alertSubRes.status === 200 && alertSubRes.body.alerts.length > 0, "User Data: POST /api/user/alerts subscribes to price drop alert in MongoDB");

    // AI Assistant
    const aiRes = await makeRequest("POST", "/api/ai/assistant", { message: "Best deals on phones with HDFC card" });
    assert(aiRes.status === 200 && Array.isArray(aiRes.body.recommendations), "AI: POST /api/ai/assistant returns smart savings recommendations");

    // 6. Business Operations CRUD (/api/business/*)
    const bizEmail = `e2e_biz_${Date.now()}@example.com`;
    const bizRegRes = await makeRequest("POST", "/api/auth/register", {
      name: "Business Partner",
      email: bizEmail,
      password: "password123",
      role: "business",
      businessName: "SuperDeals Ltd"
    });
    assert(bizRegRes.status === 201, "Business Auth: Registered business account in MongoDB");
    const bizToken = bizRegRes.body.token;

    const couponCreateRes = await makeRequest("POST", "/api/business/coupons", {
      productId: sampleProductId,
      code: `OFFER${Math.floor(Math.random() * 10000)}`,
      type: "flat",
      value: 300
    }, bizToken);
    assert(couponCreateRes.status === 201 && !!couponCreateRes.body.coupon.id, "Business CRUD: POST /api/business/coupons creates campaign in MongoDB coupons collection");
    const bizCouponId = couponCreateRes.body.coupon.id;

    const bizCouponsRes = await makeRequest("GET", "/api/business/coupons", null, bizToken);
    assert(bizCouponsRes.status === 200 && bizCouponsRes.body.coupons.some((c) => c.id === bizCouponId), "Business CRUD: GET /api/business/coupons lists business campaigns from MongoDB");

    const bizAnalyticsRes = await makeRequest("GET", "/api/business/analytics", null, bizToken);
    assert(bizAnalyticsRes.status === 200 && !!bizAnalyticsRes.body.ctr, "Business CRUD: GET /api/business/analytics returns campaign performance analytics");

    // 7. Admin Operations CRUD (/api/admin/*)
    const adminLoginRes = await makeRequest("POST", "/api/auth/login", {
      email: "admin@claimperks.com",
      password: "admin123"
    });
    assert(adminLoginRes.status === 200, "Admin Auth: Admin login successful");
    const adminToken = adminLoginRes.body.token;

    const adminCouponsRes = await makeRequest("GET", "/api/admin/coupons?status=pending", null, adminToken);
    assert(adminCouponsRes.status === 200 && adminCouponsRes.body.coupons.some((c) => c.id === bizCouponId), "Admin CRUD: GET /api/admin/coupons lists pending campaigns from MongoDB");

    const approveRes = await makeRequest("POST", `/api/admin/coupons/${bizCouponId}/approve`, null, adminToken);
    assert(approveRes.status === 200 && approveRes.body.coupon.status === "approved", "Admin CRUD: POST /api/admin/coupons/:id/approve approves campaign in MongoDB");

    const adminUsersRes = await makeRequest("GET", "/api/admin/users", null, adminToken);
    assert(adminUsersRes.status === 200 && Array.isArray(adminUsersRes.body.users), "Admin CRUD: GET /api/admin/users lists all users from MongoDB");

    const adminStatsRes = await makeRequest("GET", "/api/admin/stats", null, adminToken);
    assert(adminStatsRes.status === 200 && typeof adminStatsRes.body.totalUsers === "number", "Admin CRUD: GET /api/admin/stats returns platform counts from MongoDB");

    // 8. Security & Role Authorization Guards
    const noTokenRes = await makeRequest("GET", "/api/user/me");
    assert(noTokenRes.status === 401, "Security: Accessing protected user route with no token returns HTTP 401 Unauthorized");

    const tamperedTokenRes = await makeRequest("GET", "/api/user/me", null, userToken + "tampered");
    assert(tamperedTokenRes.status === 401, "Security: Accessing protected user route with tampered token returns HTTP 401 Unauthorized");

    const userAccessAdminRes = await makeRequest("GET", "/api/admin/users", null, userToken);
    assert(userAccessAdminRes.status === 403, "Security: Normal user accessing /api/admin/users returns HTTP 403 Forbidden");

    // 9. Logout
    const logoutRes = await makeRequest("POST", "/api/auth/logout", null, userToken);
    assert(logoutRes.status === 200, "Auth: POST /api/auth/logout returns HTTP 200 OK");

    console.log("=================================================");
    console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log("=================================================");

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
