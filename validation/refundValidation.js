const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateRefundPayload = (data) => {
    const schema = Joi.object(
    {
        orderId: Joi.string().required(),
        amount: Joi.string().required(),
       

    }).unknown()
    return schema.validate(data)
}

module.exports = validateRefundPayload