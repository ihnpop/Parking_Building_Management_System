/**
 * Custom operational error class to structure API exception responses
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Identifies known runtime API failures

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
