const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const sendMail = require("../utils/sendMail");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const {validateCreateProduct} = require('../validation/productValidation')
const mongoose = require("mongoose");


router.post(
  "/create-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      let validation = validateCreateProduct(req.body);
      if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);

      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {

        let newColorListData = []
        let imagesLinks = [];
        let colorImagesLinks = [];
        
        if (req.body.colorList && req.body.colorList.length > 0) {
          for(let h = 0;h<req.body.colorList.length;h++)
          {
            // console.log(req.body.colorList[h]);
            for (let i = 0; i < req.body.colorList[h].images.length; i++) {
              const result = await cloudinary.v2.uploader.upload(req.body.colorList[h].images[i], {
                folder: "products",
              });

               imagesLinks.push({
                public_id: result.public_id,
                url: result.secure_url,
              });
               colorImagesLinks.push({
                public_id: result.public_id,
                url: result.secure_url,
              });

              // console.log(imagesLinks);
        // console.log(colorList);

            }

            newColorListData.push({color:req.body.colorList[h].color,stock:req.body.colorList[h].stock,images:colorImagesLinks,index:req.body.colorList[h].index})
            colorImagesLinks = []
        }
          
        } else {
          // If images are not provided, use a placeholder image
          imagesLinks.push({
            public_id: "avatars/r918vmwdsmdrdvdgz1na",
            url: "https://res.cloudinary.com/derf8sbin/image/upload/v1692133632/avatars/r918vmwdsmdrdvdgz1na.jpg",
          });
        }

        
        const productData = req.body;
        productData.images = imagesLinks;
        // console.log(req.body.name)
        // console.log(imagesLinks)

        // Assign the entire shop object to productData.shop
        productData.shop = shop;
        productData.colorList = newColorListData

        const product = await Product.create(productData);



        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
     
      return next(new ErrorHandler(error, 400));
    }
  })
);


// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);



// Update product by ID endpoint
router.put(
  "/update-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const updateData = req.body;

      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      // update product reviews
      if (updateData.reviews && updateData.reviews.length > 0) {
        product.reviews = [...updateData.reviews, ...product.reviews ];
      }

      // Check if there are new colors with images to upload
      if (updateData.colorList && updateData.colorList.length > 0) {
        let newColorListData = [];
        for (let h = 0; h < updateData.colorList.length; h++) {
          let colorImagesLinks = [];
          if (updateData.colorList[h].images && updateData.colorList[h].images.length > 0) {
            for (let i = 0; i < updateData.colorList[h].images.length; i++) {
              const result = await cloudinary.v2.uploader.upload(updateData.colorList[h].images[i], {
                folder: "products",
              });
              colorImagesLinks.push({
                public_id: result.public_id,
                url: result.secure_url,
              });
            }
          }
          newColorListData.push({
            color: updateData.colorList[h].color,
            stock: updateData.colorList[h].stock,
            images: colorImagesLinks,
            index: updateData.colorList[h].index
          });
        }
        // Update the product's colorList with new color data
        product.colorList = newColorListData;
      }

      // Update other product details
      for (const key in updateData) {
        if (updateData.hasOwnProperty(key) && key !== "_id" && key !== "createdAt" && key !== "colorList") {
          product[key] = updateData[key];
        }
      }

      // Save the updated product
      await product.save();

      res.status(200).json({
        success: true,
        message: "Product details updated successfully!",
        product,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// New controller function to update the stock of a product
router.put(
  "/update-product-stock/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const { stock } = req.body;

      // Validate the stock value
      if (stock === undefined || isNaN(stock) || stock < 0) {
        return next(new ErrorHandler("Invalid stock value", 400));
      }

      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      // Update the stock value
      product.stock = stock;

      // Save the updated product
      await product.save();

      res.status(200).json({
        success: true,
        message: "Product stock updated successfully!",
        product,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);





// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }

      for (let i = 0; i < product.images.length; i++) {
        const result = await cloudinary.v2.uploader.destroy(
          product.images[i].public_id
        );
      }

      await Product.deleteOne({ _id: req.params.id });

      sendMail({
       email:product.shop.email,
       subject:`Product Deleted Successfully for ${product.shop.email}`,
       message:`We're verifying a recent Product Deletion for ${product.shop.email}`,
       html:`<h3>Hello ${product.shop.name},</h3> <p>We're verifying a recent product deletion for ${product.shop.email}</p> <p>Timestamp: ${new Date().toLocaleString()} </br>Shop Name: ${product.shop.name} </br>Product Name: ${product.name}</p> <p>If you believe that this action is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    })

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



router.get(
  "/just-arrived-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const justArrivedProducts = await Product.find().sort({ createdAt: -1 }).limit(10);

      res.status(200).json({
        success: true,
        products: justArrivedProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);


router.get(
  "/best-selling-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const bestSellingProducts = await Product.find().sort({ sold_out: -1 }).limit(10);

      res.status(200).json({
        success: true,
        products: bestSellingProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);


router.get(
  "/top-deals-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const topDealsProducts = await Product.find().sort({ discountPrice: 1 }).limit(10);

      res.status(200).json({
        success: true,
        products: topDealsProducts,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);




// Search products based on queries (name, about, and description)
router.get(
  "/search-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, about, description } = req.query;

      // Build a dynamic query based on provided parameters
      const query = {};
      if (name) query.name = { $regex: new RegExp(name, "i") }; 
      if (about) query.aboutProduct = { $regex: new RegExp(about, "i") };
      if (description) query.description = { $regex: new RegExp(description, "i") };

      const products = await Product.find(query);

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);


// Get product details by ID
router.get(
  "/get-product-details/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;

      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      res.status(200).json({
        success: true,
        product,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// ...




module.exports = router;
