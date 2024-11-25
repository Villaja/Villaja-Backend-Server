const OrderIssue = require('../model/orderIssue'); // Ensure the path matches where your model is stored

// Function to create an order issue ticket with individual parameters
exports.createOrderIssue = async (orderId, customerId, shopId, productId, productPrice, customerEmail, shopEmail, reason) => {
    try {
        const orderIssue = new OrderIssue({
            orderId: orderId,
            customerId: customerId,
            shopId: shopId,
            productId: productId,
            productPrice: productPrice,
            customerEmail: customerEmail,
            shopEmail: shopEmail,
            comment: comment,
        });

        await orderIssue.save();
        console.log('Order issue ticket created successfully');
    } catch (error) {
        console.error('Failed to create order issue ticket:', error);
    }
}; 