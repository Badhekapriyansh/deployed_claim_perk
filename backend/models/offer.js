const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    vendor: {
      type: String,
      default: "Unknown Vendor"
    }
  },
  {
    strict: false,
    collection: "offers"
  }
);

// Unique compound index on productId and vendor
offerSchema.index({ productId: 1, vendor: 1 }, { unique: true });

module.exports = mongoose.model("Offer", offerSchema);