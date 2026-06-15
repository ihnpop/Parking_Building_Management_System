const AppError = require('../utils/app-error');

/**
 * Global Express catch-all error handling middleware
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log unexpected engineering bugs
  if (err.statusCode === 500) {
    console.error('🔥 CRITICAL ERROR:', err);
  }

  // Development response returns detailed stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Production response hides engineering stack trace details
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.isOperational ? err.message : 'Something went wrong on the server.'
  });
};
