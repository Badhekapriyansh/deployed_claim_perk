const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const fs = require("fs");

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

    const offerDocuments = [];
    for (const [productId, offerData] of Object.entries(offers)) {
      // 1. Discount perks document
      offerDocuments.push({
        productId,
        coupons: offerData.coupons || [],
        cashback: offerData.cashback || [],
        bankOffers: offerData.bankOffers || [],
        upiOffers: offerData.upiOffers || []
      });

      // 2. Multi-platform vendor store offers
      if (Array.isArray(offerData.platformOffers)) {
        for (const po of offerData.platformOffers) {
          offerDocuments.push({
            productId,
            vendor: po.vendor,
            price: po.price,
            url: po.url,
            affiliateUrl: po.affiliateUrl,
            product_name: po.product_name
          });
        }
      }
    }

    if (offerDocuments.length > 0) {
      await Offer.insertMany(offerDocuments);
    }

    console.log(`Offers migrated successfully (${offerDocuments.length} offer records)`);

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