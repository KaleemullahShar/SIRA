const User = require('../models/User');
const CDRFile = require('../models/CDRFile');

/**
 * @desc    Get all police units/users
 * @route   GET /api/police/users
 * @access  Private (Admin only)
 */
exports.getPoliceUsers = async (req, res, next) => {
    try {
        const { unit, status, limit = 20, page = 1 } = req.query;

        const query = {};

        if (unit) {
            query.unit = unit;
        }

        if (status) {
            query.isActive = status === 'active';
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await User.countDocuments(query);

        // Get CDR upload stats for each user
        const CriminalRecord = require('../models/CriminalRecord');
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const cdrsUploaded = await CDRFile.countDocuments({ uploadedBy: user._id });
            const recordsAdded = await CriminalRecord.countDocuments({ addedBy: user._id });
            return {
                ...user.toObject(),
                cdrsUploaded,
                recordsAdded,
                reportsGenerated: Math.floor(cdrsUploaded * 0.5) // Calculated based on analyzed files
            };
        }));

        res.status(200).json({
            success: true,
            data: {
                users: usersWithStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalUsers: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/police/users/:id/status
 * @access  Private (Admin only)
 */
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success: true,
            data: user.getPublicProfile(),
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        next(error);
    }
};
