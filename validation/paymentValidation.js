const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateProcessPayment = (paymentInfo) => {
    const schema = Joi.object(
    {
        amount:Joi.required(),
        email:Joi.string().email().required(),
        
    }).unknown()
    return schema.validate(paymentInfo)
}

module.exports =  {
    validateProcessPayment
}
