const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    cart: [{
        type: Object,
        required: true
    }],
    shippingAddress: {
        type: Object,
        required: true,
    },
    user: {
        type: Object,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        default: "Processing",
    },
    paymentInfo: {
        id: {
            type: String,
        },
        status: {
            type: String,
        },
        type: {
            type: String,
        },
    },
    refunded:{
        type:Boolean,
        default:false
    },
    refundedAt:{
        type:Date
    },
    badOrder:{
        type:Boolean,
        default:false
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
    deliveredAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Order", orderSchema);