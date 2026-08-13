const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    title: String,
    amount: Number,
    date: String
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    productId: String,
    viewedAt: String
  },
  { _id: false }
);

const redirectSchema = new mongoose.Schema(
  {
    id: String,
    productId: String,
    productName: String,
    productImage: String,
    platform: String,
    basePrice: Number,
    finalPrice: Number,
    totalDiscount: Number,
    affiliateUrl: String,
    timestamp: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },

    name: String,

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    passwordHash: String,

    role: {
      type: String,
      default: "user"
    },

    favorites: {
      type: [String],
      default: []
    },

    history: {
      type: [historySchema],
      default: []
    },

    orders: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    redirects: {
      type: [redirectSchema],
      default: []
    },

    wallet: {
      balance: {
        type: Number,
        default: 0
      },

      transactions: {
        type: [walletTransactionSchema],
        default: []
      }
    },

    preferredBank: String,
    preferredUpi: String,
    address: String,

    createdAt: String
  },
  {
    collection: "users"
  }
);

module.exports = mongoose.model("User", userSchema);