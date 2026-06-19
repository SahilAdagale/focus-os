require('dotenv').config();
const http = require('http');
const app = require("./app");
const connectDB = require('./config/db')
const { initSocket } = require('./config/socket')

const port = 8080;
const server = http.createServer(app);

connectDB()
initSocket(server)

server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
