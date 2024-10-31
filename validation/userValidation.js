const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateRegistration = (user) => {
    const schema = Joi.object(
    {
        firstname: Joi.string(),
        email: Joi.string().email(),
        password: Joi.string().required(),
       

    }).unknown()
    return schema.validate(user)
}


const validateLogin = (user) => {
    const schema = Joi.object(
    {

        email: Joi.string().email().required(),
        password: Joi.string().required()

    }).unknown()
    return schema.validate(user)
}

const validateUpdate = (user) => {
    const schema = Joi.object(
    {
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
       
    }).unknown()
    return schema.validate(user)
}

const ValidateUserAddresses = (user) => {
    const schema = Joi.object(
        {
            // _id:Joi.string().required(),
            country:Joi.string(),
            city:Joi.string(),
            address1:Joi.string(),
            address2:Joi.string(),
            zipCode:Joi.string(),
            // addressType:Joi.required()
        }
    ).unknown()

    return schema.validate(user)
}

const ValidateUpdateUserPassword = (user) => {
    const schema = Joi.object(
        {
            oldPassword:Joi.string().required(),
            newPassword:Joi.string().required(),
            confirmPassword:Joi.string().required()
        }
    ).unknown()
    return schema.validate(user)
}

module.exports =  {
    validateRegistration,
    validateLogin,
    validateUpdate,
    ValidateUserAddresses,
    ValidateUpdateUserPassword
}