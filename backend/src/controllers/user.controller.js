const userService = require('../services/user.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getUsers = catchAsync(async (req, res, next) => {
  const result = await userService.getUsers(req.pagination);
  
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      total: result.count,
      page: req.pagination.page,
      limit: req.pagination.limit
    }
  });
});

exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    success: true,
    data: { user }
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await userService.createUser(req.body);
  res.status(201).json({
    success: true,
    data: { user: newUser }
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const updatedUser = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: { user: updatedUser }
  });
});

exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const updatedUser = await userService.updateUserStatus(req.params.id, req.body.is_active);
  res.status(200).json({
    success: true,
    data: { user: updatedUser }
  });
});
