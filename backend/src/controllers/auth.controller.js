const authService = require('../services/auth.service');
const AppError = require('../utils/app-error');

// Controller wrapper to catch asynchronous exceptions automatically
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle user Login requests
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate presence of parameters
  if (!email || !password) {
    return next(new AppError('Please provide both email and password.', 400));
  }

  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * Handle user Logout requests
 */
exports.logout = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    await authService.logout(token);
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Session invalidated.'
  });
});

/**
 * Retrieve current logged-in user profile details
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is pre-populated by protect middleware validation
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});
