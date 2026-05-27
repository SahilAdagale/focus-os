const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require('../controllers/authController');
const protect = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/user', protect, (req, res) => {
    res.json({ message: "user details", user: req.user });
})

module.exports = router;