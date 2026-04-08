const express = require('express');
const {
    getDashboardStats,
    getWeeklyActivity,
    getCaseStatus,
    getHourlyActivity,
    getAuditLogs,
    getSuspiciousIntelligence,
    getDatabaseOverview
} = require('../controllers/adminController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const router = express.Router();

router.get('/dashboard/stats', protect, authorize('admin'), getDashboardStats);
router.get('/dashboard/weekly-activity', protect, authorize('admin'), getWeeklyActivity);
router.get('/dashboard/case-status', protect, authorize('admin'), getCaseStatus);
router.get('/dashboard/hourly-activity', protect, authorize('admin'), getHourlyActivity);
router.get('/dashboard/logs', protect, authorize('admin'), getAuditLogs);
router.get('/dashboard/intelligence', protect, authorize('admin'), getSuspiciousIntelligence);
router.get('/dashboard/db-overview', protect, authorize('admin'), getDatabaseOverview);


module.exports = router;
