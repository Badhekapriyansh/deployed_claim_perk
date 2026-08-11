const fs = require("fs");
const path = require("path");

const COUPONS_FILE = path.join(__dirname, "..", "data", "coupons.json");

function readCoupons() {
  const raw = fs.readFileSync(COUPONS_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

function writeCoupons(coupons) {
  fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2));
}

function addCoupon(coupon) {
  const coupons = readCoupons();
  coupons.push(coupon);
  writeCoupons(coupons);
  return coupon;
}

function updateCoupon(id, updates) {
  const coupons = readCoupons();
  const index = coupons.findIndex((c) => c.id === id);
  if (index === -1) return null;
  coupons[index] = { ...coupons[index], ...updates };
  writeCoupons(coupons);
  return coupons[index];
}

function deleteCoupon(id) {
  const coupons = readCoupons();
  const filtered = coupons.filter((c) => c.id !== id);
  writeCoupons(filtered);
  return filtered.length !== coupons.length;
}

function findById(id) {
  return readCoupons().find((c) => c.id === id);
}

module.exports = { readCoupons, writeCoupons, addCoupon, updateCoupon, deleteCoupon, findById };
