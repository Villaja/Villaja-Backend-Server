const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
    orderId:{
        type: String,
        required: true
    },
    customerId:{
        type: String,
        required: true
    },
    transactionRef:{
        type: String,
        required: true
    },
    refundRef:{
        type: String
    },
    amount:{
        type: String,
        required: true
    },
    status:{
        type: String,
        required: true
    },
    domain:{
        type: String,
    }
},{ timestamps: true });

module.exports = mongoose.model("Refund", refundSchema);
