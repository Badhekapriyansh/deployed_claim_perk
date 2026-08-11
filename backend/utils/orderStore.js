const fs = require("fs");
const path = require("path");

const ORDERS_FILE = path.join(__dirname, "..", "data", "orders.json");

function readOrders() {
    const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
}

function writeOrders(orders) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function addOrder(order) {
    const orders = readOrders();
    orders.push(order);
    writeOrders(orders);
    return order;
}

module.exports = { readOrders, writeOrders, addOrder };
