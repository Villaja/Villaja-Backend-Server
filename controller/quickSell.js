const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const QuickSell = require('../model/quickSell');
const User = require('../model/user');
const cloudinary = require('cloudinary');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const { isAuthenticated } = require("../middleware/auth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a new QuickSell product
router.post(
  '/create-product',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const { images, name, price, category, condition, description, location, phoneNumber } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Check if the user has an existing QuickSell product
    const existingQuickSell = await QuickSell.findOne({ user: user.id, sold: false });
    if (existingQuickSell) {
      return next(new ErrorHandler('You can only have one active QuickSell product at a time.', 400));
    }

    // Upload the new images to Cloudinary
    let imagesLinks = [];
    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.v2.uploader.upload(images[i], {
        folder: 'quicksell',
      });

      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    const newQuickSell = new QuickSell({
      user: user.id,
      images: imagesLinks,
      name,
      price,
      category,
      condition,
      description,
      location,
      phoneNumber,
    });

    await newQuickSell.save();
    res.status(201).json({
      success: true,
      quickSell: newQuickSell,
    });
  })
);

// Get all QuickSell products for the current user
router.get(
  '/get-all-products-user',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      const quickSellProducts = await QuickSell.find({ user: user.id, sold: false });
      res.status(200).json({
        success: true,
        quickSellProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Sell a QuickSell product
router.patch(
  '/sell-product/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const quickSellProduct = await QuickSell.findById(id);

      if (!quickSellProduct) {
        return next(new ErrorHandler('QuickSell product not found.', 404));
      }

      if (quickSellProduct.user.toString() !== req.user.id) {
        return next(new ErrorHandler('You are not authorized to sell this product.', 403));
      }

      quickSellProduct.sold = true;
      await quickSellProduct.save();

      res.status(200).json({
        success: true,
        quickSellProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update a QuickSell product
router.put(
  '/update-product/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { images, name, price, category, condition, description, location, phoneNumber } = req.body;
      const user = await User.findById(req.user.id);

      // Find the QuickSell product by ID
      const quickSellProduct = await QuickSell.findById(id);

      if (!quickSellProduct) {
        return next(new ErrorHandler('QuickSell product not found', 404));
      }

      // Check if the user is the owner of the QuickSell product
      if (quickSellProduct.user.toString() !== user.id) {
        return next(new ErrorHandler('You are not authorized to update this product', 403));
      }

      // Upload the new images to Cloudinary
      let imagesLinks = [];
      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.v2.uploader.upload(images[i], {
          folder: 'quicksell',
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }

      // Update the QuickSell product
      quickSellProduct.images = imagesLinks;
      quickSellProduct.name = name;
      quickSellProduct.price = price;
      quickSellProduct.category = category;
      quickSellProduct.condition = condition;
      quickSellProduct.description = description;
      quickSellProduct.location = location;
      quickSellProduct.phoneNumber = phoneNumber;

      await quickSellProduct.save();

      res.status(200).json({
        success: true,
        quickSellProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete a QuickSell product
router.delete(
  '/delete-product/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user.id);

      // Find the QuickSell product by ID
      const quickSellProduct = await QuickSell.findById(id);

      if (!quickSellProduct) {
        return next(new ErrorHandler('QuickSell product not found', 404));
      }

      // Check if the user is the owner of the QuickSell product
      if (quickSellProduct.user.toString() !== user.id) {
        return next(new ErrorHandler('You are not authorized to delete this product', 403));
      }

      // Delete the images from Cloudinary
      for (let i = 0; i < quickSellProduct.images.length; i++) {
        await cloudinary.v2.uploader.destroy(quickSellProduct.images[i].public_id);
      }

      // Delete the QuickSell product
      await QuickSell.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'QuickSell product deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
