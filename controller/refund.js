const express = require('express')
const router = express()
const Refund = require('../model/refund')
const Order = require('../model/order')
const ErrorHandler = require("../utils/ErrorHandler");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const validateRefundPayload = require('../validation/refundValidation');
const { default: axios } = require('axios');


router.post('/create-refund', isAuthenticated, isAdmin('Admin'), async (req, res, next) => {
    let validation = validateRefundPayload(req.body)
    if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    try
    {
        const {orderId,productId,amount} = req.body

        const order = await Order.findById(orderId)

        if(!order)
        {
            return error(res,false,'No order with this order id')
        }

        if(parseFloat(amount) > order.totalPrice)
        {
            return error(res,false,'amount cannot be more than order amount')
        }

        const transactionRef = order.paymentInfo?.id

        if(!transactionRef)
        {
            return error(res,false,'No transaction reference for this order')
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
            amount: parseFloat(amount) * 100
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
                productId,
                customerId:order.user._id,
                transactionRef,
                amount,
                status:response.data.data.status,
                refundRef:null,
                domain

            })

            await refund.save()

            return success(res,status,message,apiResponse,200)
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
    catch(error)
    {
        console.log('error processing refund ',error.message)
        return next(new ErrorHandler(error.message, 500));
    }
})

router.get('/get-all-refunds',isAuthenticated, isAdmin('Admin'), async(req,res,next) => {
    try {
        const refunds  = (await Refund.find()).reverse()
        console.log('Successfully retrieved refunds');
        return success(res,true,'Successfully retrieved refunds',refunds,200)
        
    }
    catch(e)
    {
        console.log('error returning refunds ',error.message)
        return next(new ErrorHandler(error.message, 500));
    }
})

router.post('/get-product-price',isAuthenticated, isAdmin('Admin'), async(req,res,next) => {
    try{
        const {orderId,productId} = req.body

        const order = await Order.findById(orderId)

        if(!order)
        {
            return error(res,false,'No order with this order id')
        }
        
        const product = order.cart.filter((prod) => prod._id == productId)

        if(!product)
        {
            return error(res,false,'No product with this order id')
        }

        return success(res,true,'product price retrieved successfully',{
                price: product[0].discountPrice ?? product[0].originalPrice
            },200)

    }
    catch(e)
    {
        console.log('error returning product amount ',e.message)
        return next(new ErrorHandler(e.message, 500));
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