const express = require("express");
const app = express();
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

app.get("/", (req, res) => {
    res.send("focus os backend running....")
})

app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/user', userRoutes);

module.exports = app;
