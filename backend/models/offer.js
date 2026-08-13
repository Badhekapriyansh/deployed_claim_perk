const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    strict: false,
    collection: "offers"
  }
);

module.exports = mongoose.model("Offer", offerSchema);