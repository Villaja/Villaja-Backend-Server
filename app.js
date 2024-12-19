const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const cron = require('node-cron');
const Product = require('./model/product');
const createExchangeRateUpdater  = require("price-to-exchange-rate-update");
const { saveToken } = require('./Firebase');


app.use(cors({
  origin: ['*', 'http://localhost:3000', 'https://villaja-frontend.vercel.app', "https://www.villaja.com"],
  credentials: true
}));

// Set limit for JSON requests
app.use(express.json({ limit: "1000mb" }));

// Set limit for URL-encoded requests
app.use(express.urlencoded({ extended: true, limit: "1000mb" }));

app.use(cookieParser());

app.use("/test", (req, res) => {
  res.send("Welcome to villaja's backend server");
});

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// import routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const payment = require("./controller/payment");
const order = require("./controller/order");
const cart = require('./controller/cartItems');
const conversation = require("./controller/conversation");
const message = require("./controller/message");
const withdraw = require("./controller/withdraw");
const recomendation = require('./controller/recomendation');
const quickSell = require('./controller/quickSell');
const quickSwap = require('./controller/quickSwap');
const notFound = require('./controller/notFound');
const refund = require('./controller/refund')
const webhook = require('./controller/webhook')
const orderIssueController = require("./controller/orderIssueController");
app.use("/api/user", user);
app.use("/api/shop", shop);
app.use("/api/conversation", conversation);
app.use("/api/message", message);
app.use("/api/product", product);
app.use("/api/order", order);
app.use("/api/payment", payment);
app.use("/api/cart", cart);
app.use("/api/recomendation", recomendation);
app.use("/api/withdraw", withdraw);
app.use("/api/quick-sell", quickSell);
app.use("/api/quick-swap", quickSwap);
app.use("/api/not-found", notFound);
app.use("/api/refund", refund);
app.use("/api/webhook", webhook);
app.use("/api/order-issue", orderIssueController.router);

const updatePrices = createExchangeRateUpdater({
  fetchProducts: async () => {
    return await Product.find({});
  },
  updateProduct: async (id, data) => {
    await Product.findByIdAndUpdate(id, data);
  },

  baseCurrency: 'NGN',
  targetCurrency: 'USD'
});

// Schedule the task to run every 24 hours
cron.schedule('0 23 * * *', async () => {
  console.log('Running automated price update...');
  try {
    const result = await updatePrices();
    console.log(result);
  } catch (error) {
    console.error("Error updating prices:", error);
  }
}, {
  scheduled: true,
  timezone: "Africa/Lagos"
});

// route to manually trigger the update
app.get('/trigger-price-update', async (req, res) => {
  console.log('Manually triggering price update...');
  try {
    const result = await updatePrices();
    console.log(result);
    res.json(result);
  } catch (error) {
    console.error("Error updating prices:", error);
    res.status(500).json({ error: "Failed to update prices" });
  }
});

// it's for ErrorHandling
app.use(ErrorHandler);

module.exports = app;
