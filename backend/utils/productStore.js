const fs = require("fs");
const path = require("path");

const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

function readProducts() {
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function findProductById(id) {
  return readProducts().find((p) => p.id === id);
}

function addProduct(product) {
  const products = readProducts();
  products.push(product);
  writeProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = readProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...updates };
  writeProducts(products);
  return products[index];
}

function deleteProduct(id) {
  const products = readProducts();
  const filtered = products.filter((p) => p.id !== id);
  writeProducts(filtered);
  return filtered.length < products.length;
}

module.exports = {
  readProducts,
  writeProducts,
  findProductById,
  addProduct,
  updateProduct,
  deleteProduct
};
