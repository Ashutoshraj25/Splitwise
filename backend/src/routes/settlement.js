const express = require('express');
const router = express.Router();
const { recordSettlement, getSettlements } = require('../controllers/settlement');
const { protect } = require('../middleware/auth');

router.post('/', protect, recordSettlement);
router.get('/group/:groupId', protect, getSettlements);

module.exports = router;
