const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("focus os backend running....")
})

module.exports = app
