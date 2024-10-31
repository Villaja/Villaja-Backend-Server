const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const QuickSwap = require('../model/quickSwap');
const User = require('../model/user');
const cloudinary = require('cloudinary');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const { isAuthenticated } = require("../middleware/auth");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a new QuickSwap product
router.post(
  '/create-product',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const { userProductName, userProductCategory, userProductPrice, userProductImages, userProductCondition, swapProductName, swapProductDetails, swapProductPrice, cosmeticsCondition, screenCondition, comesWith, gadgetCondition, ramSize, storageSize, yearsUsed, location, phoneNumber } = req.body;

    // Check if required fields are provided
    if (!userProductName || !userProductCategory || !userProductPrice || !userProductImages || !userProductCondition || !swapProductName || !swapProductDetails || !swapProductPrice) {
      return next(new ErrorHandler('Please provide all required fields', 400));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Check if userProductImages is an array and has at least one image
    if (!Array.isArray(userProductImages) || userProductImages.length === 0) {
      return next(new ErrorHandler('Please provide at least one product image', 400));
    }

    const imagesLinks = [];
    for (let i = 0; i < userProductImages.length; i++) {
      const result = await cloudinary.v2.uploader.upload(userProductImages[i], {
        folder: 'quickswap',
      });

      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    const newQuickSwap = new QuickSwap({
      user: user.id,
      userProductName,
      userProductCategory,
      userProductPrice,
      userProductImages: imagesLinks,
      userProductCondition,
      swapProductName,
      swapProductDetails,
      swapProductPrice,
      cosmeticsCondition,
      screenCondition,
      comesWith,
      gadgetCondition,
      ramSize,
      storageSize,
      yearsUsed,
      location,
      phoneNumber,
    });

    await newQuickSwap.save();
    res.status(201).json({
      success: true,
      quickSwap: newQuickSwap,
    });
  })
);

// Get all QuickSwap products
router.get(
  '/get-all-products',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const quickSwapProducts = await QuickSwap.find({ isSold: false });
      res.status(200).json({
        success: true,
        quickSwapProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get details of a QuickSwap product
router.get(
  '/get-product/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const quickSwapProduct = await QuickSwap.findById(id);

      if (!quickSwapProduct) {
        return next(new ErrorHandler('QuickSwap product not found', 404));
      }

      res.status(200).json({
        success: true,
        quickSwapProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all QuickSwap products for a particular user
router.get(
  '/get-user-products',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      const quickSwapProducts = await QuickSwap.find({ user: user.id });
      res.status(200).json({
        success: true,
        quickSwapProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update a QuickSwap product
router.put(
  '/update-product/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userProductName, userProductCategory, userProductPrice, userProductImages, userProductCondition, swapProductName, swapProductDetails, swapProductPrice, cosmeticsCondition, screenCondition, comesWith, gadgetCondition, ramSize, storageSize, yearsUsed, location, phoneNumber } = req.body;
      const user = await User.findById(req.user.id);

      const quickSwapProduct = await QuickSwap.findById(id);

      if (!quickSwapProduct) {
        return next(new ErrorHandler('QuickSwap product not found', 404));
      }

      if (quickSwapProduct.user.toString() !== user.id) {
        return next(new ErrorHandler('You are not authorized to update this product', 403));
      }

      const imagesLinks = [];
      for (let i = 0; i < userProductImages.length; i++) {
        const result = await cloudinary.v2.uploader.upload(userProductImages[i], {
          folder: 'quickswap',
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });
      }

      quickSwapProduct.userProductName = userProductName;
      quickSwapProduct.userProductCategory = userProductCategory;
      quickSwapProduct.userProductPrice = userProductPrice;
      quickSwapProduct.userProductImages = imagesLinks;
      quickSwapProduct.userProductCondition = userProductCondition;
      quickSwapProduct.swapProductName = swapProductName;
      quickSwapProduct.swapProductDetails = swapProductDetails;
      quickSwapProduct.swapProductPrice = swapProductPrice;
      quickSwapProduct.cosmeticsCondition = cosmeticsCondition;
      quickSwapProduct.screenCondition = screenCondition;
      quickSwapProduct.comesWith = comesWith;
      quickSwapProduct.gadgetCondition = gadgetCondition;
      quickSwapProduct.ramSize = ramSize;
      quickSwapProduct.storageSize = storageSize;
      quickSwapProduct.yearsUsed = yearsUsed;
      quickSwapProduct.location = location;
      quickSwapProduct.phoneNumber = phoneNumber;

      await quickSwapProduct.save();

      res.status(200).json({
        success: true,
        quickSwapProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete a QuickSwap product
router.delete(
  '/delete-product/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user.id);

      const quickSwapProduct = await QuickSwap.findById(id);

      if (!quickSwapProduct) {
        return next(new ErrorHandler('QuickSwap product not found', 404));
      }

      if (quickSwapProduct.user.toString() !== user.id) {
        return next(new ErrorHandler('You are not authorized to delete this product', 403));
      }

      for (let i = 0; i < quickSwapProduct.userProductImages.length; i++) {
        await cloudinary.v2.uploader.destroy(quickSwapProduct.userProductImages[i].public_id);
      }

      await QuickSwap.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'QuickSwap product deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Mark a QuickSwap product as sold
router.patch(
  '/mark-as-sold/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const quickSwapProduct = await QuickSwap.findById(id);

      if (!quickSwapProduct) {
        return next(new ErrorHandler('QuickSwap product not found', 404));
      }

      if (quickSwapProduct.user.toString() !== req.user.id) {
        return next(new ErrorHandler('You are not authorized to mark this product as sold', 403));
      }

      quickSwapProduct.isSold = true;
      await quickSwapProduct.save();

      res.status(200).json({
        success: true,
        quickSwapProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all unsold QuickSwap products
router.get(
  '/get-unsold-products',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const unsoldQuickSwapProducts = await QuickSwap.find({ isSold: false });
      res.status(200).json({
        success: true,
        unsoldQuickSwapProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all sold QuickSwap products
router.get(
  '/get-sold-products',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const soldQuickSwapProducts = await QuickSwap.find({ isSold: true });
      res.status(200).json({
        success: true,
        soldQuickSwapProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
