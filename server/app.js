const express = require("express");
const app = express();
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

app.get("/", (req, res) => {
    res.send("focus os backend running....")
})

app.use('/api/auth', authRoutes);

module.exports = app;
