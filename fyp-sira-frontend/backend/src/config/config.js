const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sira_cdr_db',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this',
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 min
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};
