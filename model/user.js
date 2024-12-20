const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  firstname:{
    type: String,
    required: [true, "Please enter your firstname!"],
  },
  lastname:{
    type: String,
    required: [true, "Please enter your name!"],
  },
  email:{
    type: String,
    required: [true, "Please enter your email!"],
  },
  password:{
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  phoneNumber:{
    type: String,
    required: [true, "Please enter your phone"],
  },
  addresses:[
    {
      country: {
        type: String,
      },
      city:{
        type: String,
      },
      address1:{
        type: String,
      },
      address2:{
        type: String,
      },
      zipCode:{
        type: String,
      },
      addressType:{
        type: String,
      },
    }
  ],
  role:{
    type: String,
    default: "user",
  },
  emailVerificationCode: String,
  
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  pushNotificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpiry: Date, 
 createdAt:{
  type: Date,
  default: Date.now(),
 },
 resetPasswordToken: String,
 resetPasswordTime: Date,
 notificationList: [
  {
    title: String,
    body: String,
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  }
 ]
});


//  Hash password
userSchema.pre("save", async function (next){
  if(!this.isModified("password")){
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
