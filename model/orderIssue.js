const mongoose = require("mongoose");

const orderIssueSchema = new mongoose.Schema({
    orderId: String,
    customerId: String,
    shopId: String,
    productId: String,
    productPrice: {
        type: Number,
    },
    isResolved: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    resolvedAt: Date,
    customerEmail: String,
    shopEmail: String,
    responseStatus: {
        type: String,
        default: "Pending",
    },
    comment: String,
})

module.exports = mongoose.model("OrderIssue", orderIssueSchema);