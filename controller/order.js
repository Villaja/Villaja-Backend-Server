const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");

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

// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo } = req.body;

      //   group cart items by shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      // create an order for each shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice: items.reduce((total, item) => {
            if (item.discountPrice != 0 || item.discountPrice != null) {
              return total + item.discountPrice
            }
            return total + item.originalPrice
          }, 0),
          paymentInfo,
        });
        orders.push(order);

        // Get the shop owner's email (replace with the actual way you fetch shop owner's email)
        const shop = await Shop.findById(shopId);

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
                Product Color: ${JSON.stringify(order.cart[0].color)}
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

        // Send the confirmation email to the shop owner
        const sendShopEmail = () => {
          return new Promise((resolve, reject) => {
            const mailOptions = {
              from: 'villajamarketplace@gmail.com',
              to: shop.email, // Send to the shop owner's email
              subject: 'New Order Received',
              html: shopEmailHTML,
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
          await sendShopEmail(); // Wait for the email to be sent to the shop owner
          console.log('Confirmation email sent to shop owner');
        } catch (error) {
          console.error('Email sending failed:', error);
        }
      }






      // Craft a confirmation email for the user
      const adminEmailHTML = `
        <html>
          <body>
           <meta charset="UTF-8">
            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
              <h2>New Order</h2>
              <p>
                Hello Admin, ${user.firstname}! Just placed an order, track it in your dashboard.
              </p>
              <p>
                Order ID: ${orders.map(order => order._id).join(', ')}
              </p>
              <p>
                Total Price: ${totalPrice}
              </p>
              <p>
                Shipping Address: ${JSON.stringify(shippingAddress)}
              </p>
              <p>
              Product Color: ${JSON.stringify(orders[0]?.cart[0]?.color)}
              </p>
              <p>
              Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
              </p
              <p>
                Best regards,</br>
                The Villaja Team
              </p>
            </div>
          </body>
        </html>
      `;

      // Send the confirmation email to the user
      const sendAdminEmail = () => {
        return new Promise((resolve, reject) => {
          const mailOptions = {
            from: 'villajamarketplace@gmail.com',
            to: 'villajamarketplace@gmail.com', // Send to the user's email
            subject: 'Order Confirmation',
            html: adminEmailHTML,
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
        await sendAdminEmail(); // Wait for the email to be sent to the user
        console.log('Confirmation email sent to user');
      } catch (error) {
        console.error('Email sending failed:', error);
      }





      // // Craft a confirmation email for the logistics company
      // const LogisticsEmailHTML = `
      //   <html>
      //     <body>
      //      <meta charset="UTF-8">
      //       <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
      //         <h2>Your Order Has Been Placed</h2>
      //         <p>
      //           Hello, ${user.firstname}! We're delighted to inform you that your order has been successfully placed and is now in motion! 🚀.
      //           Continue shopping <a href="http://www.villaja.com">www.villaja.com</a>
      //         </p>
      //         <p>
      //           Order ID: ${orders.map(order => order._id).join(', ')}
      //         </p>
      //         <p>
      //           Total Price: ${totalPrice}
      //         </p>
      //         <p>
      //           Shipping Address: ${shippingAddress}
      //         </p>
      //         <p>
      //         Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
      //         </p
      //         <p>
      //           Best regards,</br>
      //           The Villaja Team
      //         </p>
      //       </div>
      //     </body>
      //   </html>
      // `;

      // // Send the confirmation email to the user
      // const sendLogisticsEmail = () => {
      //   return new Promise((resolve, reject) => {
      //     const mailOptions = {
      //       from: 'villajamarketplace@gmail.com',
      //       to: "movelitehq@gmail.com", // Send to the user's email
      //       subject: 'Order Confirmation',
      //       html: LogisticsEmailHTML,
      //     };

      //     transporter.sendMail(mailOptions, (error, info) => {
      //       if (error) {
      //         reject(error);
      //       } else {
      //         resolve('Email sent');
      //       }
      //     });
      //   });
      // };

      // try {
      //   await sendLogisticsEmail(); // Wait for the email to be sent to the user
      //   console.log('Confirmation email sent to user');
      // } catch (error) {
      //   console.error('Email sending failed:', error);
      // }













      // Craft a confirmation email for the user
      const userEmailHTML = `
        <html>
          <body>
           <meta charset="UTF-8">
            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
              <h2>Your Order Has Been Placed</h2>
              <p>
                Hello, ${user.firstname}! We're delighted to inform you that your order has been successfully placed and is now in motion! 🚀.
                Continue shopping <a href="http://www.villaja.com">www.villaja.com</a>
              </p>
              <p>
                Order ID: ${orders.map(order => order._id).join(', ')}
              </p>
              <p>
                Total Price: ${totalPrice}
              </p>
              <p>
              Shipping Address: ${JSON.stringify(shippingAddress)}
              </p>
              <p>
              Product Color: ${JSON.stringify(orders[0]?.cart[0]?.color)}
              </p>
              <p>
              Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
              </p
              <p>
                Best regards,</br>
                The Villaja Team
              </p>
            </div>
          </body>
        </html>
      `;

      // Send the confirmation email to the user
      const sendUserEmail = () => {
        return new Promise((resolve, reject) => {
          const mailOptions = {
            from: 'villajamarketplace@gmail.com',
            to: user.email, // Send to the user's email
            subject: 'Order Confirmation',
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
        console.log('Confirmation email sent to user');
      } catch (error) {
        console.error('Email sending failed:', error);
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



module.exports = router;
