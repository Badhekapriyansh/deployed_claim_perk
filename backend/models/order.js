const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    strict: false,
    collection: "orders"
  }
);

module.exports = mongoose.model("Order", orderSchema);