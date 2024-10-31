const mongoose = require("mongoose");

const notFoundSchema = new mongoose.Schema({
   
    productName:{
        type: String,
        required: true,
    },

    productDescription:{
        type: String,
        required: true,
    },

    Stocked:{
        type: Boolean,
        default: false,
    },
    createdAt:{
        type: Date,
        default: Date.now(),
    },
});

module.exports = mongoose.model("notFound", notFoundSchema);