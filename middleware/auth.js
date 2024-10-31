const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");

exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid token. Please login to continue", 401));
  }
});

exports.isSeller = catchAsyncErrors(async (req, res, next) => {
  const sellerToken = req.headers.authorization;

  if (!sellerToken) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  try {
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY);
    req.seller = await Shop.findById(decoded.id);
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid seller token. Please login to continue", 401));
  }
});

exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler(`${req.user.role} cannot access this resource!`, 403));
    }
    next();
  };
};
