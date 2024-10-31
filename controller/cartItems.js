const express = require("express");
const { isAuthenticated } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const CartItem = require("../model/cartItems");

// Create a cart item
router.post(
  "/create-cart-item",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;

      

      const cartItem = await CartItem.create({
        product: productId,
        quantity,
        user: req.user._id, 
      });

      res.status(201).json({
        success: true,
        cartItem,
      });
    } catch (error) {
      return next(error);
    }
  })
);

// Get all cart items for a user
router.get(
  "/get-all-cart-items",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const cartItems = await CartItem.find({ user: req.user._id }).populate(
        "product"
      );

      res.status(200).json({
        success: true,
        cartItems,
      });
    } catch (error) {
      return next(error);
    }
  })
);

// Update a cart item (e.g., change quantity)
router.put(
  "/update-cart-item/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { quantity } = req.body;
      const cartItem = await CartItem.findById(req.params.id);

      if (!cartItem) {
        return next(new ErrorHandler("Cart item not found", 404));
      }

      
      cartItem.quantity = quantity;
      await cartItem.save();

      res.status(200).json({
        success: true,
        cartItem,
      });
    } catch (error) {
      return next(error);
    }
  })
);

// Delete a cart item
router.delete(
  "/delete-cart-item/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const cartItem = await CartItem.findById(req.params.id);

      if (!cartItem) {
        return next(new ErrorHandler("Cart item not found", 404));
      }

      await cartItem.remove();

      res.status(200).json({
        success: true,
        message: "Cart item deleted successfully",
      });
    } catch (error) {
      return next(error);
    }
  })
);

module.exports = router;
