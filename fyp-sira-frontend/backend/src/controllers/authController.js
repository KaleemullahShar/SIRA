const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, config.jwtSecret, {
        expiresIn: config.jwtExpire
    });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public (can be changed to admin-only)
 */
exports.register = async (req, res, next) => {
    try {
        const { username, password, fullName, badgeNumber, unit, email, role } = req.body;

        // Create user
        const user = await User.create({
            username,
            password,
            fullName,
            badgeNumber,
            unit,
            email,
            role: role || 'user' // Default to user, admin can be set explicitly
        });

        // Generate token
        const token = generateToken(user._id);

        // Log action
        await AdminLog.create({
            user: user._id,
            action: 'User registered',
            resourceType: 'Auth',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info(`New user registered: ${username}`);

        res.status(201).json({
            success: true,
            data: {
                user: user.getPublicProfile(),
                token
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Login  user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Please provide username and password',
                    code: 'MISSING_CREDENTIALS'
                }
            });
        }

        // Check if user exists (include password for comparison)
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                }
            });
        }

        //Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Account is inactive. Contact administrator.',
                    code: 'ACCOUNT_INACTIVE'
                }
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                }
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Log action
        await AdminLog.create({
            user: user._id,
            action: 'User logged in',
            resourceType: 'Auth',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        logger.info(`User logged in: ${username}`);

        res.status(200).json({
            success: true,
            data: {
                user: user.getPublicProfile(),
                token
            },
            message: 'Login successful'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: user.getPublicProfile()
        });
    } catch (error) {
        next(error);
    }
};
