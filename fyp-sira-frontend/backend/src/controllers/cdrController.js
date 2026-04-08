const fs = require('fs');
const path = require('path');
const CDRFile = require('../models/CDRFile');
const CDRRecord = require('../models/CDRRecord');
const { parseCDRFile } = require('../services/cdrParser');
const { processEDA } = require('../services/edaProcessor');
const logger = require('../utils/logger');

/**
 * @desc    Upload and process CDR file
 * @route   POST /api/cdr/upload
 * @access  Private
 */
exports.uploadCDRFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Please upload a file',
                    code: 'NO_FILE'
                }
            });
        }

        const { filename, originalname, size, mimetype, path: filePath } = req.file;

        // Create file record
        const cdrFile = await CDRFile.create({
            uploadedBy: req.user._id,
            filename,
            originalName: originalname,
            fileSize: size,
            mimeType: mimetype,
            status: 'processing',
            processingStarted: new Date()
        });

        logger.info(`CDR file uploaded: ${originalname} by user ${req.user.username}`);

        // Process file asynchronously
        processCDRFileAsync(cdrFile._id, filePath);

        res.status(201).json({
            success: true,
            data: {
                fileId: cdrFile._id,
                filename,
                originalName: originalname,
                status: 'processing',
                uploadDate: cdrFile.uploadDate,
                message: 'File uploaded successfully. Processing started.'
            }
        });
    } catch (error) {
        // Clean up file if error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

/**
 * Process CDR file asynchronously
 */
const processCDRFileAsync = async (fileId, filePath) => {
    try {
        // Parse CSV file
        const { records, errors, summary } = await parseCDRFile(filePath);

        // Save records to database
        const cdrRecords = records.map(r => ({
            ...r,
            fileId
        }));

        if (cdrRecords.length > 0) {
            await CDRRecord.insertMany(cdrRecords);
        }

        // Update file status
        await CDRFile.findByIdAndUpdate(fileId, {
            status: 'analyzed',
            totalRecords: summary.totalRows,
            validRecords: summary.validRecords,
            errorCount: summary.errorCount,
            processingCompleted: new Date()
        });

        // Run EDA
        await processEDA(fileId);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        logger.info(`CDR file processing completed: ${fileId}`);
    } catch (error) {
        logger.error(`CDR file processing failed: ${error.message}`);

        // Update file status to error
        await CDRFile.findByIdAndUpdate(fileId, {
            status: 'error',
            errorMessage: error.message,
            processingCompleted: new Date()
        });

        // Clean up file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

/**
 * @desc    Get all CDR files
 * @route   GET /api/cdr/files
 * @access  Private
 */
exports.getCDRFiles = async (req, res, next) => {
    try {
        const { status, limit = 20, page = 1 } = req.query;

        const query = {};

        // Non-admin users can only see their own files
        if (req.user.role !== 'admin') {
            query.uploadedBy = req.user._id;
        }

        if (status) {
            query.status = status;
        }

        const files = await CDRFile.find(query)
            .populate('uploadedBy', 'username fullName badgeNumber')
            .sort({ uploadDate: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await CDRFile.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                files,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalFiles: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get actual CDR statistics (from latest file only)
 * @route   GET /api/cdr/stats
 * @access  Private
 */
exports.getCDRStats = async (req, res, next) => {
    try {
        const query = {};

        // Non-admin users can only see stats for their own uploads
        if (req.user.role !== 'admin') {
            query.uploadedBy = req.user._id;
        }

        // Get the latest file
        const latestFile = await CDRFile.findOne(query)
            .sort({ uploadDate: -1 })
            .select('_id');

        if (!latestFile) {
            return res.status(200).json({
                success: true,
                data: {
                    totalRecords: 0,
                    outgoingCalls: 0,
                    incomingCalls: 0,
                    latestFileId: null
                }
            });
        }

        // Get actual counts from CDR records for the latest file only
        const fileQuery = { fileId: latestFile._id };
        const totalRecords = await CDRRecord.countDocuments(fileQuery);
        const outgoingCalls = await CDRRecord.countDocuments({ ...fileQuery, callType: 'outgoing' });
        const incomingCalls = await CDRRecord.countDocuments({ ...fileQuery, callType: 'incoming' });
        const outgoingSMS = await CDRRecord.countDocuments({ ...fileQuery, callType: 'sms-outgoing' });
        const incomingSMS = await CDRRecord.countDocuments({ ...fileQuery, callType: 'sms-incoming' });
        const totalSMS = await CDRRecord.countDocuments({ ...fileQuery, callType: /^sms/ });

        res.status(200).json({
            success: true,
            data: {
                totalRecords,
                outgoingCalls,
                incomingCalls,
                outgoingSMS,
                incomingSMS,
                totalSMS,
                latestFileId: latestFile._id
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete all CDR files and records
 * @route   DELETE /api/cdr/files/all
 * @access  Private
 */
exports.deleteAllCDRFiles = async (req, res, next) => {
    try {
        const query = {};

        // Non-admin users can only delete their own files
        if (req.user.role !== 'admin') {
            query.uploadedBy = req.user._id;
        }

        // Get all file IDs to delete
        const files = await CDRFile.find(query).select('_id');
        const fileIds = files.map(f => f._id);

        if (fileIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No files to delete',
                data: {
                    filesDeleted: 0,
                    recordsDeleted: 0
                }
            });
        }

        // Delete all CDR records associated with these files
        const recordsResult = await CDRRecord.deleteMany({ fileId: { $in: fileIds } });

        // Delete all CDR files
        const filesResult = await CDRFile.deleteMany(query);

        logger.info(`Deleted ${filesResult.deletedCount} CDR files and ${recordsResult.deletedCount} records by user ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'All CDR files and records deleted successfully',
            data: {
                filesDeleted: filesResult.deletedCount,
                recordsDeleted: recordsResult.deletedCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get CDR file details
 * @route   GET /api/cdr/files/:id
 * @access  Private
 */
exports.getCDRFileById = async (req, res, next) => {
    try {
        const file = await CDRFile.findById(req.params.id)
            .populate('uploadedBy', 'username fullName badgeNumber');

        if (!file) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'File not found',
                    code: 'FILE_NOT_FOUND'
                }
            });
        }

        // Check ownership
        if (req.user.role !== 'admin' && file.uploadedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Not authorized to access this file',
                    code: 'UNAUTHORIZED'
                }
            });
        }

        res.status(200).json({
            success: true,
            data: file
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete CDR file
 * @route   DELETE /api/cdr/files/:id
 * @access  Private
 */
exports.deleteCDRFile = async (req, res, next) => {
    try {
        const file = await CDRFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'File not found',
                    code: 'FILE_NOT_FOUND'
                }
            });
        }

        // Check ownership
        if (req.user.role !== 'admin' && file.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Not authorized to delete this file',
                    code: 'UNAUTHORIZED'
                }
            });
        }

        // Delete associated records
        await CDRRecord.deleteMany({ fileId: req.params.id });

        // Delete file
        await file.deleteOne();

        logger.info(`CDR file deleted: ${req.params.id}`);

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
