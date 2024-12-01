const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {validateCreateShop,
    validateLoginShop,
    validateUpdateShopAvatar,
    validateUpdateSellerInfo,} = require('../validation/shopValidation')
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)


const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smpt.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'villajamarketplace@gmail.com', 
    pass: 'zzccxzuizilhkvhb',   
  },
});



// Create shop
// Create shop
router.post('/create-shop', catchAsyncErrors(async (req, res, next) => {
  try {
    const validation = validateCreateShop(req.body);
    if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    const { email } = req.body;

    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      return next(new ErrorHandler('Shop already exists', 400));
    }

    let avatar = {}; // Initialize an empty avatar object

    if (req.body.avatar) {
      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: 'avatars',
      });

      avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    } else {
      // Default image URL when no logo is provided
      avatar = {
        public_id: 'avatars/r918vmwdsmdrdvdgz1na',
        url: 'https://res.cloudinary.com/derf8sbin/image/upload/v1692133632/avatars/r918vmwdsmdrdvdgz1na.jpg',
      };
    }

    const seller = {
      name: req.body.name,
      email,
      password: req.body.password,
      avatar,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
      pushNotificationToken: req.body.pushNotificationToken,
    };

    const newSeller = await Shop.create({
      name: seller.name,
      email: seller.email,
      avatar: seller.avatar,
      password: seller.password,
      zipCode: seller.zipCode,
      address: seller.address,
      phoneNumber: seller.phoneNumber,
      emailVerificationCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
      pushNotificationToken: seller.pushNotificationToken,
    });

    // Generate a JWT token for the newly registered shop
    const token = jwt.sign({ id: newSeller._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '90d', // You can set the token expiration as needed
    });

    const verificationLink = `https://villajabackendserver-48y0h87u.b4a.run/api/shop/verify-email/${newSeller._id}/${newSeller.emailVerificationCode}`;

    // Craft the welcome email for the shop
    const emailHTML = `
      <html>
      <head>
            <meta charset="UTF-8">
      </head>
        <body>
          <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
            <h2>Welcome to Villaja Marketplace!</h2>
            <p>
              Hello ${seller.name}! My name is Daniel, the COO, Technical Manager, and co-founder of Villaja. Welcome to Villaja,
              where your journey as a valued seller begins! We're excited to have you as a part of our vibrant seller community, 
              and we can't wait to support you in achieving your business goals.
            </p>
            <p>
              At Villaja, we believe in the power of partnership, and we're committed to helping you succeed. Here's what you can expect as a seller with us:
            </p>
             <ul>
                <li>A Global Marketplace: With a wide and diverse customer base, you'll have the opportunity to showcase your products to a vast audience.</li>
                <li>Easy Setup: We've streamlined the process to make it as simple as possible for you to list your products. Our user-friendly seller dashboard and tools are designed with you in mind.</li>
                <li>Marketing Support: Benefit from our marketing and promotional efforts to boost your products' visibility and sales.</li>
                <li>Secure Transactions: Rest easy knowing that our platform provides secure and trusted payment processing to protect both you and your customers.</li>
                <li>Dedicated Support: Our seller support team is here to assist you with any questions or challenges you may encounter. We're just a message or call away.</li>
                <li>Seller Resources: Access to educational resources, tips, and best practices to help you grow your business.</li>
             </ul>
             <p>
             By the way your shop has been created, yay!🙂
             </p>
             <p>
             Please Click the link to verify your Account:
             <a href="${verificationLink}">Verify Email</a>
           </p>
             <p>
             To get started, please log in to your seller dashboard and begin listing your products.
             If you have any questions or need assistance, don't hesitate to reach out to The Villaja Team, <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>.
             We're genuinely excited to embark on this journey with you and witness your success as a seller on Villaja. Let's make this an incredible and rewarding journey for you and your business.
            <p>
             <p style="margin-bottom: 20px;">Warm regards,<br>Daniel Fasiku,<br>COO, Technical Manager, Villaja</p>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send the welcome email to the shop
    const sendEmail = () => {
      return new Promise((resolve, reject) => {
        const mailOptions = {
          from: 'villajamarketplace@gmail.com',
          to: seller.email,
          subject: 'Welcome to Villaja Marketplace',
          html: emailHTML,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve('Email sent');
          }
        });
      });
    };

    try {
      await sendEmail(); // Wait for the email to be sent
      console.log('Welcome email sent successfully');
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    // Send the token as part of the JSON response
    res.status(201).json({
      success: true,
      user: newSeller,
      token,
    });
  } catch (error) {
    console.error('Error during shop creation:', error);
    return res.status(500).json({ error: error.message });
  }
}));



router.get('/verify-email/:userId/:verificationCode', async (req, res, next) => {
  try {
    const { userId, verificationCode } = req.params;

    const user = await Shop.findById(userId);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    if (user.isEmailVerified) {
      // HTML content for already verified email
      const alreadyVerifiedHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Already Verified</title>
        </head>
        <body>
          <div style="font-family: 'Arial', sans-serif; text-align: center; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 50px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #28a745;">Email Already Verified</h2>
              <p style="margin-bottom: 20px;">Your email is already verified. Please proceed to log in to your shop.</p>
              
              <div style="margin-top: 20px;">
                <a href="http://www.villaja.com/shop/login" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease;"
                  >Log In</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    
      return res.status(200).send(alreadyVerifiedHTML);
    }

    if (user.emailVerificationCode !== verificationCode) {
      return next(new ErrorHandler('Invalid verification code', 400));
    }

    // Mark the email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;

    await user.save();

    // HTML content for email verification success
    const verificationSuccessHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Success</title>
      </head>
      <body>
        <div style="font-family: 'Arial', sans-serif; text-align: center; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 50px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #007BFF;">Email Verification Success</h2>
            <p style="margin-bottom: 20px;">Your email has been successfully verified. You can now log in to your shop.</p>
            
            <div style="margin-top: 20px;">
              <a href="http://www.villaja.com/shop/login" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px; transition: background-color 0.3s ease;"
                >Log In</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.status(200).send(verificationSuccessHTML);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});



// Login shop
router.post('/login-shop', catchAsyncErrors(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const validation = validateLoginShop(req.body);
    if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    if (!email || !password) {
      return next(new ErrorHandler('Please provide all fields!', 400));
    }

    const user = await Shop.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorHandler("Shop doesn't exist!", 400));
    }

    if (!user.isEmailVerified) {
      return next(new ErrorHandler('Please Verify Your Email', 400));
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return next(new ErrorHandler('Invalid credentials', 400));
    }

    // Generate a JWT token for the logged-in shop
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: '90d', // You can set the token expiration as needed
    });

    // Send the token as part of the JSON response
    res.status(201).json({
      success: true,
      user,
      token,
    });

    // You can also send a confirmation email to the shop here if needed.

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("shop not found", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Log out from shop
router.get('/logout', catchAsyncErrors(async (req, res, next) => {
  try {
    // In JWT-based authentication, there is no need to clear cookies.
    // Logging out can be as simple as responding with a success message.

    res.status(201).json({
      success: true,
      message: 'Log out successful!',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));


// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let validation = validateUpdateShopAvatar(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));
    
      let existsSeller = await Shop.findById(req.seller._id);

        const imageId = existsSeller.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: "avatars",
          width: 150,
        });

        existsSeller.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };

  
      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller:existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      let validation = validateUpdateSellerInfo(req.body);
      if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;

      await shop.save();

      // Craft the update seller info email
      const emailHTML = `
        <html>
          <body>
            <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
              <h2>Seller Info Updated</h2>
              <p>
                Your seller information has been updated at ${new Date()}.
                 If you didn't make this change, please contact our support team.
              </p>
               <p>
               Any questions?</br>
               Contact us: <a href="mailto:villajamarketplace@gmail.com">villajamarketplace@gmail.com</a>
               </p>
              <p>
                Best regards,
                The Villaja Team
              </p>
            </div>
          </body>
        </html>
      `;

      // Send the update seller info email to the seller
      const sendEmail = () => {
        return new Promise((resolve, reject) => {
          const mailOptions = {
            from: 'villajamarketplace@gmail.com',
            to: shop.email,
            subject: 'Seller Info Updated',
            html: emailHTML,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              reject(error);
            } else {
              resolve('Email sent');
            }
          });
        });
      };

      try {
        await sendEmail(); // Wait for the email to be sent
        console.log('Update seller info email sent successfully');
      } catch (error) {
        console.error('Email sending failed:', error);
      }

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// fetch all sellers for users
router.get("/user-get-all-sellers", catchAsyncErrors(async(req,res,next)=>{
  try {
    const sellers = await Shop.find().sort({createdAt:-1});
    res.status(201).json({
      success:true,
      sellers,
    })
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// Define a new route for password reset with validateResetPassword function
router.post('/forgot-password', catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;

    // Define the validateResetPassword function
    const validateResetPassword = (data) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      return schema.validate(data);
    };

    // Validate the email address
    let validation = validateResetPassword(req.body);
    if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    // Generate a reset token and set its expiration time
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour

    const user = await Shop.findOne({ email });

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Set the reset token and its expiry in the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;

    await user.save();

    // Send a password reset email to the user
    const resetPasswordLink = `https://villajabackendserver-48y0h87u.b4a.run/api/shop/reset-password/${resetToken}`;

    const emailHTML = `
      <html>
      <body>
        <div style="text-align: left; background-color: #f3f3f3; padding: 20px;">
          <h2>Password Reset</h2>
          <p>
            You have requested a password reset for your Villaja account.
          </p>
          <p>
            To reset your password, click on the following link:
            <a href="${resetPasswordLink}">Reset Password</a>
          </p>
          <p>
            If you didn't request this reset, please ignore this email.
          </p>
          <p>
            Best regards, <br />
            The Villaja Team
          </p>
        </div>
      </body>
      </html>
    `;

    console.log(resetPasswordLink)

    const sendEmail = () => {
      return new Promise((resolve, reject) => {
        const mailOptions = {
          from: 'villaja',
          to: email,
          subject: 'Password Reset Request',
          html: emailHTML,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve('Email sent');
          }
        });
      });
    };

    try {
      await sendEmail();
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Email sending failed:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent. Check your inbox.',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));


router.get('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find the user by the reset token
    const user = await Shop.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorHandler('Invalid or expired reset token', 400));
    }

    // Render an HTML form for resetting the password
    const resetPasswordForm = `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
    </head>
    
    <body style="font-family: Arial; padding: 20px; margin-top:30px;">
    
      <center>
        <h2 style="margin-bottom: 20px; color: dodgerblue;">Reset Your <i>Villaja</i> Password</h2>
        <form action="https://villajabackendserver-48y0h87u.b4a.run/api/shop/reset-password" method="post" style="max-width: 400px; margin: 0 auto;">
          <input type="hidden" name="token" value="${token}">
          <label for="newPassword" style="display: block; margin-bottom: 10px;">New Password:</label>
          <input type="password" name="newPassword" required style="padding: 10px; border-radius: 6px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
          <label for="confirmPassword" style="display: block; margin-bottom: 10px;">Confirm Password:</label>
          <input type="password" name="confirmPassword" required style="padding: 10px; border-radius: 6px; margin-bottom: 20px; width: 100%; box-sizing: border-box;"><br />
          <input type="submit" value="Reset Password" style="background-color: #007BFF; border-radius: 6px; color: #fff; padding: 10px 20px; border: none; cursor: pointer;">
        </form>
      </center>
    
      <script>
        if (window.location.search.includes('?success=true')) {
          alert('Password changed successfully');
          window.location.href = 'https://villaja.com/user/login';
        }
      </script>
    
    </body>
    
    </html>
    
    `;

    res.send(resetPasswordForm);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});



router.post('/reset-password', async (req, res, next) => {
  try {
    const { newPassword, confirmPassword, token } = req.body;
    const user = await Shop.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorHandler('Invalid or expired reset token', 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new ErrorHandler("Passwords don't match", 400));
    }

    // Update the user's password with the new password
    user.password = newPassword;

    // Clear the reset token and its expiry
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    // Save the user document with the new password and without the reset token
    await user.save();

    // Return a styled HTML content for a successful password reset
    const resetSuccessHTML = `
      <html>
      <head>
        <title>Password Reset Successful</title>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="text-align: center; font-family: Arial; padding: 20px;">
        <h3>Password Reset Successful</h3>
        <p>Your password has been successfully reset.</p>
        <a href="https://www.villaja.com/user/login">Click To Login</a>
      </body>
      </html>
    `;

    res.status(200).send(resetSuccessHTML);

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});



module.exports = router;
