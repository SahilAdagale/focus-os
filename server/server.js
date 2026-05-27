require('dotenv').config();
const app = require("./app");
const connectDB = require('./config/db')

const port = 8080;

connectDB()

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});