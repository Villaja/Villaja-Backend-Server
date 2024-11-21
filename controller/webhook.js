const express = require('express')
const router = express()
const Refund = require('../model/refund')
const Order = require('../model/order')
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const {validateRefundPayload} = require('../validation/refundValidation');
const { default: axios } = require('axios');

router.all('/', async (req,res) => {
    console.log('webhook is called')
    console.log('webhook data',req.body)
    
    res.status(200).json({
        message: 'webhook recieved'
    })

    const event = req.body.event.split('.')[0]
    switch (event)
    {
        case 'refund':
            handleRefund(req,res)
            break
        default :
            console.log('default case')
            break
    }

})

const handleRefund  = async (req,res) => {
    try
    {
        const refund = await Refund.findOneAndUpdate({
            transactionRef:req.body.data.transaction_reference,
            amount:req.body.data.amount,
        },{
            status:req.body.data.status,
            refundRef:req.body.data.refund_reference
        })

        await refund.save()

        console.log('refund successfully updated with status ',req.body.data.status);
    }
    catch(E)
    {
        console.log('error processing refund');
    }
}

module.exports = router