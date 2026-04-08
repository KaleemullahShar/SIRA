const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                message: 'Not authorized to access this route',
                code: 'NO_TOKEN'
            }
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Get user from database
        req.user = await User.findById(decoded.id).select('+password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        if (!req.user.isActive) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'User account is inactive',
                    code: 'ACCOUNT_INACTIVE'
                }
            });
        }

        next();
    } catch (error) {
        logger.error(`Auth middleware error: ${error.message}`);
        return res.status(401).json({
            success: false,
            error: {
                message: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            }
        });
    }
};

module.exports = protect;
