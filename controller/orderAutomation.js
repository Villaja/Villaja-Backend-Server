const schedule = require('node-schedule');
const Order = require('../model/order');
const nodemailer = require('nodemailer');
const { Expo } = require('expo-server-sdk');
const { getToken } = require('../Firebase');
const Shop = require('../model/shop');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const expo = new Expo();

// Email transporter setup
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

// Function to send notification emails
const sendNotificationEmails = async (product, order) => {
  // User email
  const userEmail = `
    <html>
      <body>
        <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
          <h2>Automatic Order Approval</h2>
          <p>
            Hello ${order.user.firstname},
          </p>
          <p>
            One of the products you ordered named "${product.name}" has been automatically reviewed and approved on your behalf since there was no response from you in 24 hours after the order had been delivered.
          </p>
          <p>
            Best regards,<br/>
            The Villaja Team
          </p>
        </div>
      </body>
    </html>
  `;

  // Seller email
  const sellerEmail = `
    <html>
      <body>
        <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
          <h2>Product Automatically Approved</h2>
          <p>
            One of your products delivered to a customer has been successfully approved automatically, you can now withdraw the amount from your dashboard.
          </p>
          <p>
            Product: ${product.name}
          </p>
          <p>
            Best regards,<br/>
            The Villaja Team
          </p>
        </div>
      </body>
    </html>
  `;

  // Admin email
  const adminEmail = `
    <html>
      <body>
        <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
          <h2>Automatic Product Approval</h2>
          <p>
            A product named "${product.name}" ordered from ${product.shop.name} by ${order.user.firstname} ${order.user.lastname} has been approved automatically.
          </p>
          <p>
            Best regards,<br/>
            The Villaja Team
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    // Send to user
    await Promise.allSettled([
      sendEmailWithRetry({
        from: 'villajamarketplace@gmail.com',
        to: order.user.email,
        subject: 'Order Automatically Approved',
        html: userEmail,
      }),
      sendEmailWithRetry({
        from: 'villajamarketplace@gmail.com',
        to: product.shop.email,
        subject: 'Product Automatically Approved',
        html: sellerEmail,
      }),
      sendEmailWithRetry({
        from: 'villajamarketplace@gmail.com',
        to: 'villajamarketplace@gmail.com',
        subject: 'Product Automatically Approved',
        html: adminEmail,
      })
    ]);
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};

const validateAndCalculatePrice = (product) => {
  const discountPrice = Number(product.discountPrice);
  const originalPrice = Number(product.originalPrice);
  
  if (isNaN(discountPrice) || isNaN(originalPrice)) {
    throw new Error('Invalid price values');
  }
  
  if (originalPrice <= 0) {
    throw new Error('Original price must be greater than 0');
  }
  
  return discountPrice === 0 || discountPrice === null ? originalPrice : discountPrice;
};

// Function to update seller's available balance
const updateSellerBalance = async (product) => {
  try {
    const seller = await Shop.findById(product.shopId);
    if (!seller) {
      throw new Error(`Seller not found for product ${product.name}`);
    }

    const productPrice = validateAndCalculatePrice(product);
    const currentBalance = Number(seller.availableBalance) || 0;
    
    seller.availableBalance = currentBalance + productPrice;
    
    await retryOperation(() => seller.save());
    
    console.log(`Seller's balance updated for product ${product.name}; Added ₦${productPrice.toLocaleString()}`);
  } catch (error) {
    console.error('Error updating seller balance:', {
      error: error.message,
      productId: product._id,
      sellerId: product.shopId
    });
    throw error; // Rethrow to handle in calling function
  }
};

// Function to check and update pending approvals
const checkAndUpdatePendingApprovals = async () => {
  try {
    const deliveredOrders = await Order.find({ status: 'Delivered' });

    for (const order of deliveredOrders) {
      let hasUpdates = false;
      
      for (const item of order.cart) {
        if (item.approvalStatus === 'Pending') {
          // Update the approval status
          item.approvalStatus = 'Approved';
          item.ratings = 5;
          item.comment = 'Very good product';
          hasUpdates = true;

          // Update seller's balance
          await updateSellerBalance(item);

          // Send notification emails
          await sendNotificationEmails(item, order);
        }
      }

      if (hasUpdates) {
        await order.save();
      }
    }
  } catch (error) {
    console.error('Error updating pending approvals:', error);
  }
};

// Function to send reminder notifications
const sendReminderNotifications = async (order) => {
  try {
    // Get pending products
    const pendingProducts = order.cart.filter(item => item.approvalStatus === 'Pending');
    if (pendingProducts.length === 0) return;

    // Calculate time remaining
    const deliveredTime = new Date(order.deliveredAt).getTime();
    const currentTime = new Date().getTime();
    const timeRemaining = 24 - Math.floor((currentTime - deliveredTime) / (1000 * 60 * 60));

    // Prepare product names
    const productNames = pendingProducts.map(item => item.name).join(', ');
    const productText = pendingProducts.length > 1 ? 'products' : 'product';

    // Email HTML
    const emailHTML = `
      <html>
        <body>
          <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
            <h2>Review Reminder</h2>
            <p>
              Hello ${order.user.firstname},
            </p>
            <p>
              This is a reminder to review the ${productText} named "${productNames}" in ${timeRemaining} hours.
            </p>
            <p>
              Best regards,<br/>
              The Villaja Team
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: 'villajamarketplace@gmail.com',
      to: order.user.email,
      subject: 'Review Your Order',
      html: emailHTML,
    });

    // Send push notification
    const userToken = await getToken(String(order.user._id));
    if (userToken && userToken.token) {
      await expo.sendPushNotificationsAsync([{
        to: userToken.token,
        title: 'Review Your Order',
        body: 'Please review the products you ordered in your cart dashboard'
      }]);
    }
  } catch (error) {
    console.error('Error sending reminder notifications:', error);
  }
};

// Update the check pending status function
const checkPendingStatus = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    const hasPending = order.cart.some(item => item.approvalStatus === 'Pending');
    
    if (hasPending) {
      console.log('Order not yet reviewed by user');
      await sendReminderNotifications(order);
    } else {
      console.log('Order reviewed by user');
    }
    
    return hasPending;
  } catch (error) {
    console.error('Error checking pending status:', error);
  }
};

const cleanupAutomation = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    // Clear any pending schedules
    const scheduledJobs = schedule.scheduledJobs;
    Object.keys(scheduledJobs)
      .filter(key => key.includes(orderId))
      .forEach(key => scheduledJobs[key].cancel());

    console.log(`Automation cleanup completed for order ${orderId}`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Main function to start automation for a specific order
const startOrderAutomation = async (orderId) => {
  console.log(`Starting automation for order ${orderId}`);
  
  const jobKey = `reminder_${orderId}`;
  const finalJobKey = `final_${orderId}`;
  
  try {
    // Schedule 2-hour interval checks
    const twoHourChecks = schedule.scheduleJob(jobKey, '*/120 * * * *', async () => {
      await retryOperation(() => checkPendingStatus(orderId));
    });

    // Schedule final check
    const finalCheck = schedule.scheduleJob(finalJobKey, new Date(Date.now() + 24 * 60 * 60 * 1000), async () => {
      await retryOperation(() => checkAndUpdatePendingApprovals());
      await cleanupAutomation(orderId);
    });

    // Add error handlers
    twoHourChecks.on('error', (error) => {
      console.error(`Reminder job error for ${orderId}:`, error);
    });

    finalCheck.on('error', (error) => {
      console.error(`Final check error for ${orderId}:`, error);
    });
  } catch (error) {
    console.error(`Failed to start automation for order ${orderId}:`, error);
    await cleanupAutomation(orderId);
  }
};

const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await sleep(delay * attempt);
      }
    }
  }
  throw lastError;
};

const sendEmailWithRetry = async (mailOptions) => {
  if (!mailOptions.to || !mailOptions.subject || !mailOptions.html) {
    throw new Error('Invalid email parameters');
  }

  return retryOperation(async () => {
    return await transporter.sendMail(mailOptions);
  });
};

module.exports = { startOrderAutomation };
