const express = require("express");
const router = express.Router();

const { startSession, completeSession } = require('../controllers/sessionController');
const protect = require("../middlewares/authMiddleware");

router.post("/start", protect, startSession);
router.put("/:id/complete", protect, completeSession)
module.exports = router;