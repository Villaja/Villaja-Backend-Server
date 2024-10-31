const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your product description!"],
  },
  category: {
    type: String,
    required: [true, "Please enter your product category!"],
  },
  tags: {
    type: String,
  },
  originalPrice: {
    type: Number,
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: [true, "Please enter your product stock!"],
  },
  condition: {
    type: String,
  },
  aboutProduct: {
    type: String,
  },
  brand: {
    type: String,
  },
  model: {
    type: String,
  },
  displaySize: {
    type: String,
  },
  color: {
    type: String,
  },
  os: {
    type: String,
  },
  memorySize: {
    type: String,
  },
  internalMemory: {
    type: String,
  },
  cellularTechnology: {
    type: String
  },
  connectivityTechnology: {
    type: String,
  },
  simCard: {
    type: String,
  },
  dimensions: {
    type: String,
  },
  serialNumber: {
    type: String,
  },
  weight: {
    type: String,
  },
  inTheBox: {
    type: String,
  },
  minDelivery: {
    type: String,
  },
  maxDelivery: {
    type: String,
  },
  colorList:[
    {
      color:{
        type:String
      },
      stock:{
        type:Number,
        required:true
      },
      images:[
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
      index:{
        type:String
      }
    }
  ],
    
  images: [
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
  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt:{
        type: Date,
        default: Date.now(),
      }
    },
  ],
  ratings: {
    type: Number,
    default:0
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    default: {}
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Product", productSchema);
