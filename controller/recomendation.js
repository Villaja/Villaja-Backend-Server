const express = require("express");
const router = express.Router();
const Order = require("../model/order");
const Product = require("../model/product");

router.get("/recommend-products/:userId", async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Fetch the user's order history
    const userOrders = await Order.find({ "user._id": userId }).populate("cart.product");

    // Extract the products from order history
    const orderedProducts = [];
    userOrders.forEach((order) => {
      order.cart.forEach((item) => {
        orderedProducts.push(item.product);
      });
    });

    // Identify unique products in order history
    const uniqueProductIds = [...new Set(orderedProducts.map((product) => product._id))];

    // Recommend products based on the unique products in order history
    const recommendedProducts = await Product.find({
      _id: { $nin: uniqueProductIds }, 
    }).limit(5); 

    res.status(200).json({
      success: true,
      recommendedProducts,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
