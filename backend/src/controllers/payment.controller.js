const paymentService = require('../services/payment.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getPayments = catchAsync(async (req, res, next) => {
  const result = await paymentService.getPayments(req.pagination);
  
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

exports.getPaymentById = catchAsync(async (req, res, next) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  res.status(200).json({
    success: true,
    data: payment
  });
});
