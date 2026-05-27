const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "token not found" });
    }

    try {
        const verfiy = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verfiy;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Invalid Token" });
    }
};

module.exports = protect;