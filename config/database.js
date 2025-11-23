const mongoose = require('mongoose');

const dbConnection = () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then((conn) => {
      console.log(`Database Connected: ${conn.connection.host}`);
    })
    .catch((err) => {
      console.error(`Database Error: ${err}`);
      process.exit(1);
    });
};

module.exports = dbConnection;
