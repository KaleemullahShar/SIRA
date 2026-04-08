const User = require('../models/User');
const CDRFile = require('../models/CDRFile');
const CriminalRecord = require('../models/CriminalRecord');
const CDRRecord = require('../models/CDRRecord');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const { getDateRange } = require('../utils/dateUtils');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        const { start, end } = getDateRange('month');

        // Police users stats
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = totalUsers - activeUsers;

        // CDR files stats
        const totalCDRFiles = await CDRFile.countDocuments();
        const last30Days = await CDRFile.countDocuments({
            uploadDate: { $gte: start, $lte: end }
        });

        // Criminal records
        const totalCriminalRecords = await CriminalRecord.countDocuments();

        // High-risk numbers (from analytics with flags)
        const highRiskNumbers = await AnalyticsSummary.countDocuments({
            'suspiciousActivityFlags.0': { $exists: true } // Has at least one flag
        });

        // Investigations (could be based on CDR files with specific status)
        const ongoingInvestigations = await CDRFile.countDocuments({
            status: { $in: ['processing', 'analyzed'] }
        });

        // Reports generated (using CDR files as proxy)
        const reportsThisMonth = await CDRFile.countDocuments({
            status: 'analyzed',
            processingCompleted: { $gte: start, $lte: end }
        });

        res.status(200).json({
            success: true,
            data: {
                totalPoliceUsers: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: inactiveUsers
                },
                cdrFilesAnalyzed: {
                    total: totalCDRFiles,
                    last30Days: last30Days
                },
                ongoingInvestigations: {
                    total: ongoingInvestigations,
                    highPriority: Math.floor(ongoingInvestigations * 0.18) // Estimate
                },
                highRiskNumbers,
                criminalRecords: totalCriminalRecords,
                reportsGenerated: {
                    thisMonth: reportsThisMonth
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get weekly activity
 * @route   GET /api/admin/dashboard/weekly-activity
 * @access  Private (Admin only)
 */
exports.getWeeklyActivity = async (req, res, next) => {
    try {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekData = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const cdrFiles = await CDRFile.countDocuments({
                uploadDate: { $gte: date, $lt: nextDate }
            });

            const investigations = await CDRFile.countDocuments({
                uploadDate: { $gte: date, $lt: nextDate },
                status: { $in: ['processing', 'analyzed'] }
            });

            weekData.push({
                day: days[i],
                cdrFiles,
                investigations,
                reports: Math.floor(investigations * 0.7) // Estimate
            });
        }

        res.status(200).json({
            success: true,
            data: weekData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get case status distribution
 * @route   GET /api/admin/dashboard/case-status
 * @access  Private (Admin only)
 */
exports.getCaseStatus = async (req, res, next) => {
    try {
        const statuses = [
            { name: 'Active', value: 0, color: '#3b82f6' },
            { name: 'Pending', value: 0, color: '#f59e0b' },
            { name: 'Closed', value: 0, color: '#10b981' },
            { name: 'On Hold', value: 0, color: '#6b7280' }
        ];

        // You can customize this based on your actual case tracking
        const analyzed = await CDRFile.countDocuments({ status: 'analyzed' });
        const processing = await CDRFile.countDocuments({ status: 'processing' });
        const error = await CDRFile.countDocuments({ status: 'error' });

        statuses[0].value = analyzed;
        statuses[1].value = processing;
        statuses[2].value = error;
        statuses[3].value = Math.floor(analyzed * 0.1);

        res.status(200).json({
            success: true,
            data: statuses
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get hourly activity for 24-hour chart
 * @route   GET /api/admin/dashboard/hourly-activity
 * @access  Private (Admin only)
 */
exports.getHourlyActivity = async (req, res, next) => {
    try {
        // Aggregate actual CDR records by hour from the last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const hourlyActivity = await CDRRecord.aggregate([
            {
                $match: {
                    callDateTime: { $gte: yesterday }
                }
            },
            {
                $group: {
                    _id: { $hour: '$callDateTime' },
                    calls: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        // Format data for chart (fill missing hours with 0)
        const hourlyData = [];
        for (let i = 0; i < 24; i += 4) {
            const hour = `${i.toString().padStart(2, '0')}:00`;
            const found = hourlyActivity.find(h => h._id === i);
            hourlyData.push({
                hour,
                calls: found ? found.calls : 0
            });
        }

        res.status(200).json({
            success: true,
            data: hourlyData
        });
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Get system audit logs
 * @route   GET /api/admin/dashboard/logs
 * @access  Private (Admin only)
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const AdminLog = require('../models/AdminLog');

        const logs = await AdminLog.find()
            .populate('user', 'fullName username role')
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const total = await AdminLog.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                logs: logs.map(log => ({
                    id: log._id,
                    action: log.action,
                    user: log.user ? log.user.fullName || log.user.username : 'System',
                    timestamp: log.timestamp,
                    details: log.details || '',
                    type: log.action.toLowerCase().includes('login') ? 'auth' :
                        log.action.toLowerCase().includes('create') ? 'admin' :
                            log.action.toLowerCase().includes('upload') ? 'upload' : 'view'
                })),
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get suspicious intelligence (top risky numbers)
 * @route   GET /api/admin/dashboard/intelligence
 * @access  Private (Admin only)
 */
exports.getSuspiciousIntelligence = async (req, res, next) => {
    try {
        const suspiciousNumbers = await AnalyticsSummary.find({
            'suspiciousActivityFlags.0': { $exists: true }
        })
            .sort({ totalCalls: -1 })
            .limit(10);

        const intelligence = await Promise.all(suspiciousNumbers.map(async (s) => {
            const highSeverity = s.suspiciousActivityFlags.some(f => f.severity === 'high');
            
            // Get location from recent CDR records
            const recentRecord = await CDRRecord.findOne({ 
                $or: [{ callingNumber: s.phoneNumber }, { calledNumber: s.phoneNumber }]
            }).sort({ callDateTime: -1 });
            
            // Calculate trend by comparing with previous period
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            
            const lastWeek = await CDRRecord.countDocuments({
                $or: [{ callingNumber: s.phoneNumber }, { calledNumber: s.phoneNumber }],
                callDateTime: { $gte: weekAgo }
            });
            const previousWeek = await CDRRecord.countDocuments({
                $or: [{ callingNumber: s.phoneNumber }, { calledNumber: s.phoneNumber }],
                callDateTime: { $gte: twoWeeksAgo, $lt: weekAgo }
            });
            
            const trendPercentage = previousWeek > 0 
                ? Math.round(((lastWeek - previousWeek) / previousWeek) * 100)
                : 0;
            
            // Extract city/area from location string (before the first |)
            const locationStr = recentRecord?.location || 'Unknown';
            const locationParts = locationStr.split('|')[0]; // Get part before coordinates
            const cityMatch = locationParts.match(/,\s*([^,]+),\s*([^,]+)$/); // Extract last two parts
            const displayLocation = cityMatch ? cityMatch[1].trim() : (locationStr !== 'Unknown' ? locationParts.split(',').slice(-2).join(', ').trim() : 'Unknown');
            
            return {
                number: s.phoneNumber,
                callCount: s.totalCalls,
                riskLevel: highSeverity ? 'High' : 'Medium',
                lastSeen: new Date(s.updatedAt).toLocaleDateString(),
                location: displayLocation || 'Unknown',
                trend: trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`
            };
        }));

        res.status(200).json({
            success: true,
            data: intelligence
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get criminal database overview (distribution metrics)
 * @route   GET /api/admin/dashboard/db-overview
 * @access  Private (Admin only)
 */
exports.getDatabaseOverview = async (req, res, next) => {
    try {
        const totalRecords = await CriminalRecord.countDocuments();

        const statusDistribution = await CriminalRecord.aggregate([
            { $group: { _id: '$status', value: { $sum: 1 } } }
        ]);

        const crimeTypeDistribution = await CriminalRecord.aggregate([
            { $group: { _id: '$crimeType', count: { $sum: 1 } } }
        ]);

        const totalHighRisk = await CriminalRecord.countDocuments({ status: 'active' });

        res.status(200).json({
            success: true,
            data: {
                totalRecords,
                totalHighRisk,
                underInvestigation: await CriminalRecord.countDocuments({ status: 'active' }),
                closedCases: await CriminalRecord.countDocuments({ status: 'closed' }),
                statusData: statusDistribution.map(s => ({
                    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
                    value: s.value,
                    color: s._id === 'active' ? '#ef4444' : '#10b981'
                })),
                crimeTypeData: crimeTypeDistribution.map(c => ({
                    type: c._id,
                    count: c.count
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
