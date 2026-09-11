const mongoose = require('mongoose');
const Product = require('../models/Product.js');
const Offer = require('../models/Offer.js');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sampleIds = ['p1', 'p2', 'p3', 'p83', 'p102', 'p110', 'p123'];
  for (const id of sampleIds) {
    const p = await Product.findOne({ id }).lean();
    const offers = await Offer.find({ productId: id }).lean();
    console.log(`\nProduct: ${p.id} ${p.name} (${p.category}) -> Base: ₹${p.basePrice} on ${p.platform}`);
    offers.forEach(o => {
      if (o.vendor) console.log(`  - Store: ${o.vendor} | Price: ₹${o.price} | URL: ${o.affiliateUrl}`);
    });
  }
  await mongoose.disconnect();
}
test();
