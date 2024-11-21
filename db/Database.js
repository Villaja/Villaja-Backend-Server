const mongoose = require('mongoose');
const app = require("../app");

var DB_URL

if (process.env.NODE_ENV !== "PRODUCTION") {
     DB_URL = process.env.DB_URL_TEST
}
else
{
    DB_URL = process.env.DB_URL
}

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true 
    });
    
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // create server
const server = app.listen(process.env.PORT, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT}`
  );
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = connectDatabase;