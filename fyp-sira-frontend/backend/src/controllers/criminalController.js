const CriminalRecord = require('../models/CriminalRecord');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');

/**
 * @desc    Get all criminal records
 * @route   GET /api/criminal/records
 * @access  Private
 */
exports.getCriminalRecords = async (req, res, next) => {
    try {
        const { search, status, crimeType, limit = 20, page = 1 } = req.query;

        const query = {};

        if (status) {
            query.status = status.toLowerCase();
        }

        if (crimeType) {
            query.crimeType = crimeType;
        }

        // Text search
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { cnic: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { crimeType: { $regex: search, $options: 'i' } }
            ];
        }

        const records = await CriminalRecord.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await CriminalRecord.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                records,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalRecords: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get criminal record by ID
 * @route   GET /api/criminal/records/:id
 * @access  Private
 */
exports.getCriminalRecordById = async (req, res, next) => {
    try {
        const record = await CriminalRecord.findById(req.params.id)
            .populate('addedBy', 'username fullName');

        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Criminal record not found',
                    code: 'RECORD_NOT_FOUND'
                }
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create criminal record
 * @route   POST /api/criminal/records
 * @access  Private (Admin or Police)
 */
exports.createCriminalRecord = async (req, res, next) => {
    try {
        const { name, cnic, phone, crimeType, date, status, description, aliases, associatedNumbers, tags } = req.body;

        const record = await CriminalRecord.create({
            name,
            cnic,
            phone,
            crimeType,
            date,
            status,
            description,
            aliases,
            associatedNumbers,
            tags,
            addedBy: req.user._id
        });

        // Log action
        await AdminLog.create({
            user: req.user._id,
            action: 'Criminal record created',
            resourceType: 'Criminal',
            resourceId: record._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info(`Criminal record created: ${record.name} by ${req.user.username}`);

        res.status(201).json({
            success: true,
            data: record,
            message: 'Criminal record created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update criminal record
 * @route   PUT /api/criminal/records/:id
 * @access  Private (Admin or Police)
 */
exports.updateCriminalRecord = async (req, res, next) => {
    try {
        const record = await CriminalRecord.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Criminal record not found',
                    code: 'RECORD_NOT_FOUND'
                }
            });
        }

        // Log action
        await AdminLog.create({
            user: req.user._id,
            action: 'Criminal record updated',
            resourceType: 'Criminal',
            resourceId: record._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info(`Criminal record updated: ${req.params.id}`);

        res.status(200).json({
            success: true,
            data: record,
            message: 'Criminal record updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete criminal record
 * @route   DELETE /api/criminal/records/:id
 * @access  Private (Admin or Police)
 */
exports.deleteCriminalRecord = async (req, res, next) => {
    try {
        const record = await CriminalRecord.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Criminal record not found',
                    code: 'RECORD_NOT_FOUND'
                }
            });
        }

        await record.deleteOne();

        // Log action
        await AdminLog.create({
            user: req.user._id,
            action: 'Criminal record deleted',
            resourceType: 'Criminal',
            resourceId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info(`Criminal record deleted: ${req.params.id}`);

        res.status(200).json({
            success: true,
            message: 'Criminal record deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Check phone numbers against criminal database
 * @route   POST /api/criminal/check-numbers
 * @access  Private
 */
exports.checkNumbers = async (req, res, next) => {
    try {
        const { numbers } = req.body;

        if (!numbers || !Array.isArray(numbers)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Please provide an array of numbers',
                    code: 'INVALID_INPUT'
                }
            });
        }

        const matches = await CriminalRecord.find({
            $or: [
                { phone: { $in: numbers } },
                { associatedNumbers: { $in: numbers } }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                totalChecked: numbers.length,
                matches: matches.length,
                records: matches
            }
        });
    } catch (error) {
        next(error);
    }
};
