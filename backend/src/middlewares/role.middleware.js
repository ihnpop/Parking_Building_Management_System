const AppError = require('../utils/app-error');

/**
 * Restrict endpoint access to designated roles
 * @param {...string} allowedRoles - List of authorized roles (e.g. 'ADMIN', 'MANAGER')
 */
exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Confirm auth credentials populated by protect middleware
    if (!req.user || !req.user.role) {
      return next(new AppError('User details missing from request authentication context.', 401));
    }

    // Compare user role against authorized values list
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Access Denied: You do not possess clearance for this operation.', 403));
    }

    next();
  };
};
