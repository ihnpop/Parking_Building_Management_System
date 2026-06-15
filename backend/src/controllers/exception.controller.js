const exceptionService = require('../services/exception.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getExceptions = catchAsync(async (req, res, next) => {
  const result = await exceptionService.getExceptions(req.pagination);
  
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

exports.getExceptionById = catchAsync(async (req, res, next) => {
  const log = await exceptionService.getExceptionById(req.params.id);
  res.status(200).json({
    success: true,
    data: log
  });
});

exports.logException = catchAsync(async (req, res, next) => {
  const newLog = await exceptionService.logException({
    session_id: req.body.session_id,
    staff_id: req.user.id,
    exception_type: req.body.exception_type,
    justification: req.body.justification
  });

  res.status(201).json({
    success: true,
    data: newLog
  });
});

exports.resolveException = catchAsync(async (req, res, next) => {
  const resolvedLog = await exceptionService.resolveException(req.params.id, {
    resolved_by: req.user.id,
    resolution_notes: req.body.resolution_notes
  });

  res.status(200).json({
    success: true,
    data: resolvedLog
  });
});
