const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true
    },
    vendor: {
      type: String
    }
  },
  {
    strict: false,
    collection: "offers"
  }
);

offerSchema.index({ productId: 1, vendor: 1 });

module.exports = mongoose.model("Offer", offerSchema);