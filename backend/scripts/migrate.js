require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const Product = require("../models/product");
const Offer = require("../models/offer");
const Order = require("../models/order");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");
    console.log("Database:", mongoose.connection.name);

    // Read existing JSON data
    const users = readJSON("users.json");
    const products = readJSON("products.json");
    const offers = readJSON("offers.json");
    const orders = readJSON("orders.json");

    console.log("Users:", users.length);
    console.log("Products:", products.length);
    console.log("Offers:", Object.keys(offers).length);
    console.log("Orders:", orders.length);

    // USERS
    await User.deleteMany({});
    await User.insertMany(users);
    console.log("Users migrated successfully");

    // PRODUCTS
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Products migrated successfully");

    // ORDERS
    await Order.deleteMany({});
    await Order.insertMany(orders);
    console.log("Orders migrated successfully");

    // OFFERS
    await Offer.deleteMany({});

    const offerDocuments = Object.entries(offers).map(
      ([productId, offerData]) => ({
        productId,
        ...offerData
      })
    );

    if (offerDocuments.length > 0) {
      await Offer.insertMany(offerDocuments);
    }

    console.log("Offers migrated successfully");

    await mongoose.disconnect();

    console.log("");
    console.log("================================");
    console.log("Migration completed successfully");
    console.log("================================");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();