const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateCreateShop = (shop) => {
    const schema = Joi.object(
    {
        name:Joi.string().required(),
        email:Joi.string().email().required(),
        password:Joi.string().required(),
        avatar:Joi.string(),
        address:Joi.string().required(),
        phoneNumber:Joi.number().required(),
        zipCode:Joi.number().required()

    }).unknown()
    return schema.validate(shop)
}

const validateLoginShop = (shop) => {
    const schema = Joi.object(
    {
        email:Joi.string().email().required(),
        password:Joi.string().required(),
        

    }).unknown()
    return schema.validate(shop)
}

const validateUpdateShopAvatar= (shop) => {
    const schema = Joi.object(
    {
        
        avatar:Joi.string().required(),
        
    }).unknown()
    return schema.validate(shop)
}

const validateUpdateSellerInfo= (shop) => {
    const schema = Joi.object(
    {
        name:Joi.string().required(),
        description:Joi.string().required(),
        address:Joi.string().required(),
        phoneNumber:Joi.number().required(),
        zipCode:Joi.number().required()

    }).unknown()
    return schema.validate(shop)
}


module.exports =  {
    validateCreateShop,
    validateLoginShop,
    validateUpdateShopAvatar,
    validateUpdateSellerInfo
}
