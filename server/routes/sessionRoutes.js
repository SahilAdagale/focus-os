const express = require("express");
const router = express.Router();

const { startSession, completeSession, getSessions } = require('../controllers/sessionController');
const protect = require("../middlewares/authMiddleware");

router.post("/start", protect, startSession);
router.put("/:id/complete", protect, completeSession);
router.get("/", protect, getSessions);
module.exports = router;