const express = require('express')
const router = express()
const Refund = require('../model/refund')
const Order = require('../model/order')
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const validateRefundPayload = require('../validation/refundValidation');
const { default: axios } = require('axios');


router.post('/create-refund', async (req, res, next) => {

    let validation = validateRefundPayload(req.body)
    if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    try
    {
        const {orderId,amount} = req.body

        const order = await Order.findById(orderId)

        if(!order)
        {
            error(res,false,'No order with this order id')
        }

        if(parseFloat(amount) > order.totalPrice)
        {
            error(res,false,'amount cannot be more than order amount')
        }

        const transactionRef = order.paymentInfo?.id

        if(!transactionRef)
        {
            error(res,false,'No transaction reference for this order')
        }

        const paystackBaseUrl = process.env.PAYSTACK_BASE_URL
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
        const config  = { headers:{
            'Authorization': `Bearer ${paystackSecretKey}`,
            'cache-control': 'no-cache',
            'Content-Type': 'application/json'
        }}
        const payload = JSON.stringify({
            transaction:transactionRef,
            amount
        })

        console.log('paystack request start');
        

        const response = await axios.post(paystackBaseUrl+'/refund',
            payload,
            config
        )

        console.log('paystack request end');


        if(response.data.status)
        {
            const status = response.data.status
            const message = response.data.message
            const apiResponse = response.data.data
            const domain = response.data.data.domain

            const refund = await Refund.create({
                orderId,
                customerId:order.user._id,
                transactionRef,
                amount,
                status:response.data.data.status,
                refundRef:null,
                domain

            })

            await refund.save()

            success(res,status,message,apiResponse,200)
        }
        else
        {
            return res.status(400).json(
                {
                    success: false,
                    message: response.data.message
                }
            )
        }

    }
    catch(e)
    {
        return console.log(e.message)
    }
})



const success = (res,status,message,data = [],code = 200) => {
    return res.status(code).json(
                {
                    success: status,
                    message,
                    data
                }
            )
}

const error = (res,status,message,data = [],code = 400) => {
    return res.status(code).json(
                {
                    success: status,
                    message,
                    data
                }
            )
}

module.exports = router