/**
 * Middleware to check if user has required role
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Not authenticated',
                    code: 'NOT_AUTHENTICATED'
                }
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    message: `User role '${req.user.role}' is not authorized to access this route`,
                    code: 'INSUFFICIENT_PERMISSIONS'
                }
            });
        }

        next();
    };
};

module.exports = authorize;
