const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const nodemailer = require('nodemailer');
const { getToken } = require('../Firebase');
const { Expo } = require('expo-server-sdk');
const { createOrderIssue } = require('./orderIssueController');


const expo = new Expo();


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

// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      // group cart items by shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const product = await Product.findById(item.product);
        if (!product) {
          return next(new ErrorHandler(`Product not found with id ${item.product}`, 404));
        }
        const shopId = product.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push({
          product: item.product,
          quantity: item.quantity,
          approvalStatus: "Pending"
        });
      }

      // create an order for each shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
        });
        orders.push(order);

        // Get the shop owner's email
        const shop = await Shop.findById(shopId);
        if (!shop) {
          continue; // Skip if shop not found
        }

        // Craft a confirmation email for the shop owner
        const shopEmailHTML = `
          <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Received</h2>
                <p>
                  Exciting news, ${shop.name}! You have received a new order on Villaja Marketplace.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Total Price: ${totalPrice}
                </p>
                <p>
                Shipping Address: ${JSON.stringify(shippingAddress)}
                </p>
                <p>
                Products Ordered:
                ${items.map(async (item) => {
                  const product = await Product.findById(item.product);
                  return `
                    <div>
                      - ${product.name} (Quantity: ${item.quantity})
                    </div>
                  `;
                }).join('')}
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
                </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        // Send email to shop owner
        const mailOptions = {
          from: 'villajamarketplace@gmail.com',
          to: shop.email,
          subject: 'New Order Received',
          html: shopEmailHTML
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log('Error sending email:', error);
          } else {
            console.log('Email sent:', info.response);
          }
        });

        // Send push notification to shop owner
        const { token } = await getToken(shopId);
        if (token) {
          await expo.sendPushNotificationsAsync([
            {
              to: token,
              title: 'New Order Received',
              body: `You have received a new order worth ${totalPrice}`,
            },
          ]);
        }
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }
      if (req.body.status === "Ready To Ship" || req.body.status === "Delivered") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      // Store the previous status for comparison
      const previousStatus = order.status;

      order.status = req.body.status;

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = order.totalPrice * 0.0;
        await updateSellerInfo(order.totalPrice - serviceCharge);
      }

      await order.save({ validateBeforeSave: false });

      // If the status has changed, send a notification email to the user
      if (previousStatus !== req.body.status) {
        // Craft a notification email for the user
        const userEmailHTML = `
          <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>Order Status Update</h2>
                <p>
                  Hello, ${order.user.firstname}! The status of your order (${order._id}) on Villaja Marketplace has been updated.
                </p>
                <p>
                  New Status: ${req.body.status}
                </p>
                <p>
                  Best regards,
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        // Send the notification email to the user
        const sendUserEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: order.user.email, // Send to the user's email
              subject: 'Order Status Update',
              html: userEmailHTML,
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
          await sendUserEmail(); // Wait for the email to be sent to the user
          console.log('Notification email sent to the user');
        } catch (error) {
          console.error('Email sending failed:', error);
        }
      }

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(amount) {
        const seller = await Shop.findById(req.seller.id);

        seller.availableBalance = amount;

        await seller.save();
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 }); // Sort by createdAt in descending order
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// Update order status for admin
router.put(
  "/admin-update-order-status/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }


      if (req.body.status === "Ready To Ship" || req.body.status === "Delivered") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty, o.color);
        });
      }

      // Store the previous status for comparison
      const previousStatus = order.status;

      order.status = req.body.status;

      // You can add any additional logic here based on your requirements.
      // For example, if the status is "Delivered," you can update the deliveredAt and paymentInfo status.

      if (req.body.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = order.totalPrice * 0.0;
        await updateSellerInfo(order, order.totalPrice - serviceCharge);
      }

      await order.save({ validateBeforeSave: false });

      // If the status has changed, send a notification email to the user
      if (previousStatus !== req.body.status) {
        // Craft a notification email for the user
        const userEmailHTML = `
          <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>Order Status Update</h2>
                <p>
                  Hello, ${order.user.firstname}! The status of your order (${order._id}) on Villaja Marketplace has been updated by the admin.
                </p>
                <p>
                  New Status: ${req.body.status}
                </p>
                <p>
                  Best regards,
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        // Send the notification email to the user
        const sendUserEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: order.user.email, // Send to the user's email
              subject: 'Order Status Update',
              html: userEmailHTML,
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
          await sendUserEmail(); // Wait for the email to be sent to the user
          console.log('Notification email sent to the user');
        } catch (error) {
          console.error('Email sending failed:', error);
        }
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }

    async function updateOrder(id, qty, color) {
      const product = await Product.findById(id);

      // Find the index of the color to update
      const colorIndex = product.colorList.findIndex((cl) => cl.color === color);

      if (colorIndex !== -1) {
        // Update the stock directly within the color object
        product.colorList[colorIndex].stock -= qty;

        await product.updateOne(
          {
            $inc: {
              sold_out: qty,
              stock: (qty * -1),
            },
            $set: {
              colorList: product.colorList,
            },
          },
          { new: true }
        );
      } else {
        // Handle the case where the color is not found
        console.error("Color not found in colorList:", color);
        // Implement appropriate error handling or actions
      }


      await product.save({ validateBeforeSave: false });



    }

    async function updateSellerInfo(order, amount) {

      const seller = await Shop.findById(order.cart[0].shop._id);

      seller.availableBalance = seller.availableBalance + amount;

      await seller.save();
    }
  })
);


// Get admin order by ID
router.get(
  "/admin-order/:id",
  isAuthenticated, // Ensure user is authenticated
  isAdmin("Admin"), // Ensure the user is an admin
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this ID", 404));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put(
  "/update-product-approval/:orderId/:productId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { approvalStatus, reason, rating, comment } = req.body;
      const { orderId, productId } = req.params;

      const order = await Order.findById(orderId).populate('user');
      if (!order) {
        return next(new ErrorHandler("Order not found with this ID", 404));
      }

      // Find the product in the cart and update its approval status
      const productIndex = order.cart.findIndex(item => item._id.toString() === productId);
      if (productIndex === -1) {
        return next(new ErrorHandler("Product not found in order", 404));
      }

      // Update the product's approval status
      order.cart[productIndex].approvalStatus = approvalStatus;

      // Find the actual product document to update its reviews
      const product = await Product.findById(order.cart[productIndex]._id);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      // Create and add the review
      const review = {
        user: {
          _id: order.user._id,
          firstname: order.user.firstname,
          lastname: order.user.lastname,
          email: order.user.email
        },
        rating: rating,
        comment: comment,
        productId: product._id,
        createdAt: new Date()
      };

      product.reviews.push(review);

      // Update product's average rating
      const totalRating = product.reviews.reduce((sum, item) => sum + item.rating, 0);
      product.ratings = totalRating / product.reviews.length;

      // Save both the order and product
      await Promise.all([order.save(), product.save()]);

      if (approvalStatus === "Approved") {
        const adminEmail = "villajamarketplace@gmail.com";
        const userId = String(order.user._id);
        const userEmail = order.user.email;
        const subject = `Order Confirmation ${approvalStatus}`;

        //seller email message
        const sellerMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Approval Received</h2>
                <p>
                 Congratulations! An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname}.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Rating: ${rating}/5
                </p>
                <p>
                  Review: "${comment}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                 The total price has been added to your available balance to withdraw.
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        //user email message    
        const userMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Approval Given</h2>
                <p>
                  You have successfully ${approvalStatus.toLowerCase()} your order with ID ${order._id}.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Your Rating: ${rating}/5
                </p>
                <p>
                  Your Review: "${comment}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                 Thank you for shopping with us!
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        //admin email message 
        const adminMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Approval Received</h2>
                <p>
                  An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname}.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Customer Rating: ${rating}/5
                </p>
                <p>
                  Customer Review: "${comment}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        //Send email notification to the user 
        const sendUserEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: userEmail,
              subject: subject,
              html: userMessage
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

        //Send email notification to the admin
        const sendAdminEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: adminEmail,
              subject: subject,
              html: adminMessage
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

        // Send email to seller
        const sendSellerEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: product.shop.email,
              subject: subject,
              html: sellerMessage
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
          await Promise.all([
            sendUserEmail(),
            sendAdminEmail(),
            sendSellerEmail()
          ]);
          console.log('Approved order email sent to user, admin and seller');
        } catch (error) {
          console.error('Email sending failed:', error);
        }

        // Send mobile app push notification to user
        const { token: userToken } = await getToken(userId);
        if (userToken) {
          expo.sendPushNotificationsAsync([{
            to: userToken,
            title: `${approvalStatus} Order Approval`,
            body: `You have successfully ${approvalStatus.toLowerCase()} your order with ID ${order._id}`
          }]);
        }

        // Send mobile app push notification to seller
        const sellerId = String(product.shop._id);
        const { token: sellerToken } = await getToken(sellerId);
        if (sellerToken) {
          expo.sendPushNotificationsAsync([{
            to: sellerToken,
            title: `${approvalStatus} Order Approval`,
            body: `An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname}`
          }]);
        }

      } else if (approvalStatus === "Declined") {
        // Create order issue ticket
        await createOrderIssue(
          order._id,
          order.user._id,
          product.shop._id,
          product._id,
          product.discountPrice || product.originalPrice,
          order.user.email,
          product.shop.email,
          reason
        );

        const subject = `Order ${approvalStatus}`;

        //seller email message for declined order
        const sellerMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Declined</h2>
                <p>
                  An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname}.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Rating: ${rating}/5
                </p>
                <p>
                  Review: "${comment}"
                </p>
                <p>
                  Reason for Decline: "${reason}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                 You have 48 hours to respond to this order issue on your dashboard before the order is automatically cancelled and the user is refunded.
                </p>
                <p>
                 Your product will be returned to you after it has been picked up from the user
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        //user email message for declined order   
        const userMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Decline Raised</h2>
                <p>
                  You have successfully ${approvalStatus.toLowerCase()} your order with ID ${order._id}. An order issue ticket will be raised immediately to alert the seller of the product you ordered.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Your Rating: ${rating}/5
                </p>
                <p>
                  Your Review: "${comment}"
                </p>
                <p>
                  Reason for Decline: "${reason}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                 A response from the seller of this product will be sent to you via chat on the app and if no response is received within 48 hours, the order will be automatically cancelled and you will be refunded.
                </p>
                <p>
                 Thank you for shopping with us!
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        //admin email message for declined order
        const adminMessage = `
        <html>
            <body>
              <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                <h2>New Order Decline Received</h2>
                <p>
                  An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname} ordered from ${product.shop.name}.
                </p>
                <p>
                  Order ID: ${order._id}
                </p>
                <p>
                  Product: ${product.name}
                </p>
                <p>
                  Customer Rating: ${rating}/5
                </p>
                <p>
                  Customer Review: "${comment}"
                </p>
                <p>
                  Reason for Decline: "${reason}"
                </p>
                <p>
                  Total Price: ${order.totalPrice}
                </p>
                <p>
                  Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
                <p>
                  Best regards,</br>
                  The Villaja Team
                </p>
              </div>
            </body>
          </html>
        `;

        // Send emails
        const sendEmails = async () => {
          const mailOptions = [
            {
              from: 'villajamarketplace@gmail.com',
              to: product.shop.email,
              subject,
              html: sellerMessage
            },
            {
              from: 'villajamarketplace@gmail.com',
              to: order.user.email,
              subject,
              html: userMessage
            },
            {
              from: 'villajamarketplace@gmail.com',
              to: 'villajamarketplace@gmail.com',
              subject,
              html: adminMessage
            }
          ];

          await Promise.all(
            mailOptions.map(options => 
              new Promise((resolve, reject) => {
                transporter.sendMail(options, (error, info) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve('Email sent');
                  }
                });
              })
            )
          );
        };

        try {
          await sendEmails();
          console.log('Declined order emails sent successfully');
        } catch (error) {
          console.error('Email sending failed:', error);
        }

        // Send mobile app push notifications
        const { token: userToken } = await getToken(order.user._id.toString());
        if (userToken) {
          expo.sendPushNotificationsAsync([{
            to: userToken,
            title: `${approvalStatus} Order Approval`,
            body: `You have successfully ${approvalStatus.toLowerCase()} your order with ID ${order._id}. An order issue ticket will be raised immediately to alert the seller of the product you ordered.`
          }]);
        }

        const sellerId = String(product.shop._id);
        const { token: sellerToken } = await getToken(sellerId);
        if (sellerToken) {
          expo.sendPushNotificationsAsync([{
            to: sellerToken,
            title: `${approvalStatus} Order Approval`,
            body: `An order has been ${approvalStatus.toLowerCase()} by ${order.user.firstname} ${order.user.lastname}. You have 48 hours to respond to this order issue on your dashboard before the order is automatically cancelled and the user is refunded.`
          }]);
        }
      }

      res.status(200).json({
        success: true,
        message: `Product approval status updated to ${approvalStatus} and review added`,
        order,
        product
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
