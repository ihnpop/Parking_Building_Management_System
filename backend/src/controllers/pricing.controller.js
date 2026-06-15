const pricingService = require('../services/pricing.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getPolicies = catchAsync(async (req, res, next) => {
  // Pass filters query to the service
  const policies = await pricingService.getPolicies(req.pagination);
  res.status(200).json({
    success: true,
    data: policies
  });
});

exports.getPolicyById = catchAsync(async (req, res, next) => {
  const policy = await pricingService.getPolicyById(req.params.id);
  res.status(200).json({
    success: true,
    data: policy
  });
});

exports.createPolicy = catchAsync(async (req, res, next) => {
  const policy = await pricingService.createPolicy(req.body);
  res.status(201).json({
    success: true,
    data: policy
  });
});

exports.deletePolicy = catchAsync(async (req, res, next) => {
  await pricingService.deletePolicy(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Pricing policy deleted successfully.'
  });
});
