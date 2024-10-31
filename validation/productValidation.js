const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateCreateProduct = (product) => {
    const schema = Joi.object(
    {
        name:Joi.string().required(),
        description:Joi.string().required(),
        category:Joi.string().required(),
        tags:Joi.string(),
        originalPrice:Joi.number().required(),
        stock:Joi.number().required(),
        images:Joi.array(),
        shopId:Joi.string().required(),
       

    }).unknown()
    return schema.validate(product)
}

module.exports =  {
    validateCreateProduct
}
