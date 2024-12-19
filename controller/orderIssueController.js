const express = require("express");
const router = express.Router();
const OrderIssue = require('../model/orderIssue');
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const nodemailer = require('nodemailer');
const { getToken } = require('../Firebase');
const { Expo } = require('expo-server-sdk');
const { isAuthenticated, isAdmin } = require("../middleware/auth");

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

// Function to create an order issue ticket with individual parameters
exports.createOrderIssue = async (orderId, customerId, shopId, productId, productPrice, customerEmail, shopEmail, shopName, comment) => {
    try {
        const orderIssue = new OrderIssue({
            orderId,
            customerId,
            shopId,
            productId,
            productPrice,
            customerEmail,
            shopEmail,
            shopName,
            customerName,
            comment,
        });

        await orderIssue.save();
        console.log('Order issue ticket created successfully');
    } catch (error) {
        console.error('Failed to create order issue ticket:', error);
    }
}; 

// Update order issue response status
router.put(
    "/update-status/:issueId",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { issueId } = req.params;
            const { responseStatus } = req.body;

            if (!responseStatus) {
                return next(new ErrorHandler("Response status is required", 400));
            }

            const orderIssue = await OrderIssue.findById(issueId);

            if (!orderIssue) {
                return next(new ErrorHandler("Order issue not found", 404));
            }

            orderIssue.responseStatus = responseStatus;

            if (responseStatus === "Resolved") {
                orderIssue.isResolved = true;
                orderIssue.resolvedAt = Date.now();
            }

            if (responseStatus === "In Progress") {
                const adminEmail = "villajamarketplace@gmail.com";

                // Seller email message
                const sellerMessage = `
                    <html>
                        <body>
                            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                                <h2>Order Issue Update</h2>
                                <p>
                                    You have initiated contact with the customer regarding Order ID: ${orderIssue.orderId}
                                </p>
                                <p>
                                    Please ensure to resolve this issue promptly through the chat system.
                                </p>
                                <p>
                                    Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
                                </p>
                                <p>
                                    Best regards,<br/>
                                    The Villaja Team
                                </p>
                            </div>
                        </body>
                    </html>
                `;

                // Customer email message
                const customerMessage = `
                    <html>
                        <body>
                            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                                <h2>Order Issue Update</h2>
                                <p>
                                 The seller ${orderIssue.shopName} has initiated contact regarding your Order Issue for Order ID: ${orderIssue.orderId}
                                </p>
                                <p>
                                    Please check your chat messages to communicate with the seller.
                                </p>
                                <p>
                                    Any questions? Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
                                </p>
                                <p>
                                    Best regards,<br/>
                                    The Villaja Team
                                </p>
                            </div>
                        </body>
                    </html>
                `;

                // Admin email message
                const adminMessage = `
                    <html>
                        <body>
                            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
                                <h2>Order Issue Update</h2>
                                <p>
                                    The seller ${orderIssue.shopName} has initiated contact with the customer ${orderIssue.customerName} for Order ID: ${orderIssue.orderId}
                                </p>
                                <p>
                                    Issue Status: In Progress
                                </p>
                                <p>
                                    Best regards,<br/>
                                    The Villaja Team
                                </p>
                            </div>
                        </body>
                    </html>
                `;

                // Send emails using Promise.all
                try {
                    await Promise.all([
                        // Send to seller
                        transporter.sendMail({
                            from: 'villajamarketplace@gmail.com',
                            to: orderIssue.shopEmail,
                            subject: 'Order Issue Update - In Progress',
                            html: sellerMessage
                        }),
                        // Send to customer
                        transporter.sendMail({
                            from: 'villajamarketplace@gmail.com',
                            to: orderIssue.customerEmail,
                            subject: 'Order Issue Update - Seller Response',
                            html: customerMessage
                        }),
                        // Send to admin
                        transporter.sendMail({
                            from: 'villajamarketplace@gmail.com',
                            to: adminEmail,
                            subject: 'Order Issue Update - In Progress',
                            html: adminMessage
                        })
                    ]);

                    // Send push notifications
                    const [customerToken, sellerToken] = await Promise.all([
                        getToken(orderIssue.customerId),
                        getToken(orderIssue.shopId)
                    ]);

                    const notifications = [];

                    if (customerToken && customerToken.token) {
                        notifications.push({
                            to: customerToken.token,
                            title: "Order Issue Update",
                            body: "The seller has initiated contact regarding your order issue. Please check your messages."
                        });
                    }

                    if (sellerToken && sellerToken.token) {
                        notifications.push({
                            to: sellerToken.token,
                            title: "Order Issue Update",
                            body: "You have initiated contact with the customer. Please proceed with the resolution process."
                        });
                    }

                    if (notifications.length > 0) {
                        await expo.sendPushNotificationsAsync(notifications);
                    }

                } catch (error) {
                    console.error('Notification error:', error);
                    // Continue execution even if notifications fail
                }
            }

            await orderIssue.save();

            res.status(200).json({
                success: true,
                message: "Response status updated successfully",
                orderIssue
            });

        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Get all order issues for a seller
router.get(
    "/get-seller-issues/:shopId",
    catchAsyncErrors(async (req, res, next) => {
        try {
            const { shopId } = req.params;

            if (!shopId) {
                return next(new ErrorHandler("Shop ID is required", 400));
            }

            const orderIssues = await OrderIssue.find({ shopId })
                .sort({ createdAt: -1 }); // Sort by newest first

            res.status(200).json({
                success: true,
                orderIssues
            });

        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// Get all order issues (admin only)
router.get(
    "/admin/all-issues",
    isAuthenticated,
    isAdmin("Admin"),
    catchAsyncErrors(async (req, res, next) => {
        try {
            const orderIssues = await OrderIssue.find()
                .sort({ createdAt: -1 }); // Sort by newest first

            res.status(200).json({
                success: true,
                orderIssues
            });

        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

module.exports = router; 