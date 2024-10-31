const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const Withdraw = require("../model/withdraw");
// const sendMail = require("../utils/sendMail"); // Remove this line
const router = express.Router();

const nodemailer = require('nodemailer')


const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smpt.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'villajamarketplace@gmail.com', 
    pass: 'zzccxzuizilhkvhb',   
  },
});

// create-withdraw-request
router.post(
  "/create-withdraw-request",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { amount } = req.body;

      const data = {
        seller: req.seller,
        amount,
      };

      const withdraw = await Withdraw.create(data);

      const shop = await Shop.findById(req.seller._id);

      shop.availableBalance = shop.availableBalance - amount;

      await shop.save();

      // Craft a confirmation email for the seller
      const emailHTML = `
        <html>
          <body>
            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
              <h2>Withdrawal Request Confirmation</h2>
              <p>
                Hello, ${shop.name}! Your withdrawal request has been received.
              </p>
              <p>
                Requested Amount: ${amount}
              </p>
              <p>
                Best regards,
                The Villaja Team
              </p>
            </div>
          </body>
        </html>
      `;

      // Send the confirmation email to the seller
      const sendEmail = () => {
        return new Promise((resolve, reject) => {
          const mailOptions = {
            from: 'villajamarketplace@gmail.com',
            to: shop.email, // Send to the shop owner's email
            subject: 'Withdrawal Request Confirmation',
            html: emailHTML,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              reject(error);
            } else {
              resolve('Email sent');
            }
          });
        });
      };

      try {
        await sendEmail(); // Wait for the email to be sent
        console.log('Withdrawal request confirmation email sent to the seller');
      } catch (error) {
        console.error('Email sending failed:', error);
      }

      res.status(201).json({
        success: true,
        withdraw,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all withdraws --- admin

router.get(
  "/get-all-withdraw-request",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const withdraws = await Withdraw.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        withdraws,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update-withdraw-request
router.put(
  "/update-withdraw-request/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sellerId } = req.body;

      const withdraw = await Withdraw.findByIdAndUpdate(
        req.params.id,
        {
          status: "succeed",
          updatedAt: Date.now(),
        },
        { new: true }
      );

      const seller = await Shop.findById(sellerId);

      const transection = {
        _id: withdraw._id,
        amount: withdraw.amount,
        updatedAt: withdraw.updatedAt,
        status: withdraw.status,
      };

      seller.transections = [...seller.transections, transection];

      await seller.save();

      // Craft a confirmation email for the seller
      const emailHTML = `
        <html>
          <body>
            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
              <h2>Withdrawal Request Update</h2>
              <p>
                Hello, ${seller.name}! Your withdrawal request has been deposited to your account.
              </p>
              <p>
                Requested Amount: ${withdraw.amount}
              </p>
              <p>
                Best regards,
                The Villaja Team
              </p>
            </div>
          </body>
        </html>
      `;

      // Send the confirmation email to the seller
      const sendEmail = () => {
        return new Promise((resolve, reject) => {
          const mailOptions = {
            from: 'villajamarketplace@gmail.com',
            to: seller.email, // Send to the seller's email
            subject: 'Withdrawal Request Update',
            html: emailHTML,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              reject(error);
            } else {
              resolve('Email sent');
            }
          });
        });
      };

      try {
        await sendEmail(); // Wait for the email to be sent
        console.log('Withdrawal request update email sent to the seller');
      } catch (error) {
        console.error('Email sending failed:', error);
      }

      res.status(201).json({
        success: true,
        withdraw,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;
