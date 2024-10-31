const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", 
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1, 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const CartItem = mongoose.model("CartItem", cartItemSchema);

module.exports = CartItem;
