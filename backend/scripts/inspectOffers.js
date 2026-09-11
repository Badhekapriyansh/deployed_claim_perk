const mongoose = require('mongoose');
const Offer = require('../models/Offer.js');
const Product = require('../models/Product.js');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimperks');
  const allOffers = await Offer.find({}).lean();
  console.log('Total offers in DB:', allOffers.length);
  const withVendor = allOffers.filter(o => o.vendor);
  console.log('Offers with vendor:', withVendor.length);
  const withoutVendor = allOffers.filter(o => !o.vendor);
  console.log('Offers without vendor:', withoutVendor.length);
  
  const withoutUrl = withVendor.filter(o => !o.affiliateUrl && !o.url);
  console.log('Offers with vendor but NO url:', withoutUrl.length);

  // Check if any product has multiple offers for the SAME vendor
  const vendorCountsByProduct = {};
  for (const o of withVendor) {
    if (!vendorCountsByProduct[o.productId]) vendorCountsByProduct[o.productId] = {};
    const v = o.vendor.toLowerCase();
    vendorCountsByProduct[o.productId][v] = (vendorCountsByProduct[o.productId][v] || 0) + 1;
  }
  let duplicates = 0;
  for (const [pid, vendors] of Object.entries(vendorCountsByProduct)) {
    for (const [v, count] of Object.entries(vendors)) {
      if (count > 1) {
        console.log(`Product ${pid} has ${count} offers for vendor ${v}`);
        duplicates++;
      }
    }
  }
  console.log('Total duplicates found:', duplicates);

  await mongoose.disconnect();
}
test();
