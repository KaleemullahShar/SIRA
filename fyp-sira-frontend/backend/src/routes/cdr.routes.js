const express = require('express');
const { uploadCDRFile, getCDRFiles, getCDRFileById, deleteCDRFile, getCDRStats, deleteAllCDRFiles } = require('../controllers/cdrController');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadCDRFile);
router.get('/files', protect, getCDRFiles);
router.get('/stats', protect, getCDRStats);
router.delete('/files/all', protect, deleteAllCDRFiles);
router.get('/files/:id', protect, getCDRFileById);
router.delete('/files/:id', protect, deleteCDRFile);

module.exports = router;
