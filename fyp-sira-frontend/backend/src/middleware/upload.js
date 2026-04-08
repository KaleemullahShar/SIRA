const multer = require('multer');
const path = require('path');
const config = require('../config/config');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: originalname_timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '_' + uniqueSuffix + ext);
    }
});

// File filter - allow CSV and Excel files
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'text/plain'
    ];
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.xlsm'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls, .xlsm) are allowed'), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.maxFileSize // 50MB
    }
});

module.exports = upload;
