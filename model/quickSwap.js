const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the QuickSwap
const QuickSwapSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userProductName: {
    type: String,
    required: true,
  },
  userProductCategory: {
    type: String,
    required: true,
  },
  userProductPrice: {
    type: Number,
    required: true,
  },
  userProductImages: [
    {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  ],
  userProductCondition: {
    type: String,
    required: true,
  },
  swapProductName: {
    type: String,
    required: true,
  },
  swapProductDetails: {
    type: String,
    required: true,
  },
  swapProductPrice: {
    type: Number,
    required: true,
  },
  isSold: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  cosmeticsCondition: {
    type: String,
    required: false,
  },
  screenCondition: {
    type: String,
    required: false,
  },
  comesWith: {
    type: String,
    required: false,
  },
  gadgetCondition: {
    type: String,
    required: false,
  },
  ramSize: {
    type: String,
    required: false,
  },
  storageSize: {
    type: String,
    required: false,
  },
  yearsUsed: {
    type: Number,
    required: false,
  },
  location: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model('QuickSwap', QuickSwapSchema);
