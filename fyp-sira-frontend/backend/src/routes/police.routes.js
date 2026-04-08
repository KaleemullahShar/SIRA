const express = require('express');
const { getPoliceUsers, toggleUserStatus } = require('../controllers/policeController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const router = express.Router();

router.get('/users', protect, authorize('admin'), getPoliceUsers);
router.put('/users/:id/status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
