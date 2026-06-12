const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroupDetails,
  addMember,
  removeMember,
  getGroupMessages,
} = require('../controllers/group');
const { protect } = require('../middleware/auth');

router.post('/', protect, createGroup);
router.get('/', protect, getGroups);
router.get('/:id', protect, getGroupDetails);
router.get('/:id/messages', protect, getGroupMessages);
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;

