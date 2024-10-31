const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const NotFound = require("../model/notFound");
const ErrorHandler = require("../utils/ErrorHandler");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'villajamarketplace@gmail.com',
    pass: 'zzccxzuizilhkvhb',
  },
});

// Route to create a new not found product
router.post(
  "/create",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { productName, productDescription } = req.body;

      const notFoundProduct = await NotFound.create({
        productName,
        productDescription,
      });

      // Send email notification
      const mailOptions = {
        from: 'villajamarketplace@gmail.com',
        to: 'villajamarketplace@gmail.com',
        subject: 'New Not Found Product',
        text: `A new not found product has been created:\n\nProduct Name: ${notFoundProduct.productName}\nProduct Description: ${notFoundProduct.productDescription}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      res.status(201).json({
        success: true,
        message: "Not found product created successfully",
        notFoundProduct,
      });
    } catch (error) {
      next(error);
    }
  })
);

// Route to get all not found products
router.get(
  "/all",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const notFoundProducts = await NotFound.find();

      res.status(200).json({
        success: true,
        notFoundProducts,
      });
    } catch (error) {
      next(error);
    }
  })
);

// Route to mark a not found product as stocked
router.put(
  "/mark-stocked/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const notFoundProduct = await NotFound.findById(req.params.id);

      if (!notFoundProduct) {
        return next(new ErrorHandler("Not found product not found", 404));
      }

      notFoundProduct.Stocked = true;
      await notFoundProduct.save();

      res.status(200).json({
        success: true,
        message: "Not found product marked as stocked",
        notFoundProduct,
      });
    } catch (error) {
      next(error);
    }
  })
);

module.exports = router;