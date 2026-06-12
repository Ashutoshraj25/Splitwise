const express = require('express');
const router = express.Router();
const {
  createExpense,
  editExpense,
  deleteExpense,
} = require('../controllers/expense');
const { protect } = require('../middleware/auth');

router.post('/', protect, createExpense);
router.put('/:id', protect, editExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;
