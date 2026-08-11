import axios from "axios";

const client = axios.create({
  baseURL: "/api"
});

// Attach the saved JWT (if any) to every request automatically.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("cp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchProducts = async (query = "", category = "", page = 1, limit = 24, platform = "", sortBy = "") => {
  const params = { page, limit };
  if (query) params.query = query;
  if (category) params.category = category;
  if (platform) params.platform = platform;
  if (sortBy) params.sortBy = sortBy;
  const res = await client.get("/products", { params });
  return res.data; // { total, page, limit, totalPages, products }
};

export const fetchCategories = async () => {
  const res = await client.get("/categories");
  return res.data.categories;
};

export const fetchPlatforms = async () => {
  const res = await client.get("/platforms");
  return res.data.platforms;
};

export const fetchBrands = async () => {
  const res = await client.get("/brands");
  return res.data.brands;
};

export const fetchGroupedBrands = async () => {
  const res = await client.get("/brands/grouped");
  return res.data.brandHubs;
};

export const compareProducts = async (productIds) => {
  const res = await client.post("/products/compare", { productIds });
  return res.data;
};

export const fetchOffers = async (productId) => {
  const res = await client.get(`/offers/${productId}`);
  return res.data;
};

export const registerUser = async (name, email, password, role, businessName) => {
  const res = await client.post("/auth/register", { name, email, password, role, businessName });
  return res.data;
};

export const loginUser = async (email, password) => {
  const res = await client.post("/auth/login", { email, password });
  return res.data;
};

export const fetchMe = async () => {
  const res = await client.get("/user/me");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await client.put("/user/profile", data);
  return res.data;
};

export const fetchFavorites = async () => {
  const res = await client.get("/user/favorites");
  return res.data.favorites;
};

export const toggleFavorite = async (productId) => {
  const res = await client.post(`/user/favorites/${productId}`);
  return res.data;
};

export const fetchHistory = async () => {
  const res = await client.get("/user/history");
  return res.data.history;
};

export const logHistory = async (productId) => {
  const res = await client.post(`/user/history/${productId}`);
  return res.data;
};

export const clearHistory = async () => {
  const res = await client.delete("/user/history");
  return res.data;
};

export const deleteHistoryItem = async (productId) => {
  const res = await client.delete(`/user/history/${productId}`);
  return res.data;
};

export const fetchOrders = async () => {
  const res = await client.get("/user/orders");
  return res.data.orders;
};

export const createOrder = async (productId, paymentMethod, shippingAddress, cardOrUpi) => {
  const res = await client.post("/user/orders", { productId, paymentMethod, shippingAddress, cardOrUpi });
  return res.data;
};

export const fetchRedirects = async () => {
  const res = await client.get("/user/redirects");
  return res.data.redirects;
};

export const logRedirect = async (payload) => {
  const res = await client.post("/user/redirects", payload);
  return res.data;
};

export const clearRedirects = async () => {
  const res = await client.delete("/user/redirects");
  return res.data;
};

export const deleteRedirectItem = async (id) => {
  const res = await client.delete(`/user/redirects/${id}`);
  return res.data;
};

export const fetchWallet = async () => {
  const res = await client.get("/user/wallet");
  return res.data.wallet;
};

export const withdrawWallet = async (amount, upiId) => {
  const res = await client.post("/user/wallet/withdraw", { amount, upiId });
  return res.data;
};

export const fetchNotifications = async () => {
  const res = await client.get("/user/notifications");
  return res.data.notifications;
};

export const subscribePriceAlert = async (productId, targetPrice) => {
  const res = await client.post("/user/alerts", { productId, targetPrice });
  return res.data;
};

export const askAiAssistant = async (message) => {
  const res = await client.post("/ai/assistant", { message });
  return res.data;
};

// Business
export const fetchMyCoupons = async () => {
  const res = await client.get("/business/coupons");
  return res.data.coupons;
};

export const createCoupon = async (payload) => {
  const res = await client.post("/business/coupons", payload);
  return res.data.coupon;
};

export const deleteCoupon = async (couponId) => {
  const res = await client.delete(`/business/coupons/${couponId}`);
  return res.data;
};

export const fetchBusinessAnalytics = async () => {
  const res = await client.get("/business/analytics");
  return res.data;
};

// Admin
export const fetchAdminCoupons = async (status) => {
  const res = await client.get("/admin/coupons", { params: status ? { status } : {} });
  return res.data.coupons;
};

export const approveCoupon = async (couponId) => {
  const res = await client.post(`/admin/coupons/${couponId}/approve`);
  return res.data.coupon;
};

export const rejectCoupon = async (couponId) => {
  const res = await client.post(`/admin/coupons/${couponId}/reject`);
  return res.data.coupon;
};

export const fetchAdminUsers = async () => {
  const res = await client.get("/admin/users");
  return res.data.users;
};

export const fetchAdminStats = async () => {
  const res = await client.get("/admin/stats");
  return res.data;
};

export default client;
