const express = require('express');
const {
    getCriminalRecords,
    getCriminalRecordById,
    createCriminalRecord,
    updateCriminalRecord,
    deleteCriminalRecord,
    checkNumbers
} = require('../controllers/criminalController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const router = express.Router();

router.get('/records', protect, getCriminalRecords);
router.get('/records/:id', protect, getCriminalRecordById);
router.post('/records', protect, authorize('admin', 'user'), createCriminalRecord);
router.put('/records/:id', protect, authorize('admin', 'user'), updateCriminalRecord);
router.delete('/records/:id', protect, authorize('admin', 'user'), deleteCriminalRecord);
router.post('/check-numbers', protect, checkNumbers);

module.exports = router;
