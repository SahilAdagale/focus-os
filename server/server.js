require('dotenv').config();
const http = require('http');
const app = require("./app");
const connectDB = require('./config/db')
const { initSocket } = require('./config/socket')
const { startWorker } = require('./workers/worker')
const { startScheduler } = require('./workers/scheduler')

const port = 8080;
const server = http.createServer(app);

connectDB().then(() => {
    startWorker()
    startScheduler()
}).catch(err => {
    console.error('Database connection failed:', err)
})

initSocket(server)

server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
