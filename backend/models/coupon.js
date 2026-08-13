const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    businessId: String,
    businessName: String,
    productId: String,
    code: String,
    type: String,
    value: Number,
    maxValue: Number,
    status: {
      type: String,
      default: "pending"
    },
    createdAt: String
  },
  {
    strict: false,
    collection: "coupons"
  }
);

module.exports = mongoose.model("Coupon", couponSchema);
