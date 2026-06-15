const reportService = require('../services/report.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  const summary = await reportService.getDashboardSummary();
  res.status(200).json({
    success: true,
    data: summary
  });
});

exports.getRevenueReport = catchAsync(async (req, res, next) => {
  const { start_date, end_date } = req.query;
  const report = await reportService.getRevenueReport(start_date, end_date);
  res.status(200).json({
    success: true,
    data: report
  });
});

exports.getOccupancyReport = catchAsync(async (req, res, next) => {
  const report = await reportService.getOccupancyReport();
  res.status(200).json({
    success: true,
    data: report
  });
});

exports.getPeakHoursReport = catchAsync(async (req, res, next) => {
  const { start_date, end_date } = req.query;
  const report = await reportService.getPeakHoursReport(start_date, end_date);
  res.status(200).json({
    success: true,
    data: report
  });
});

exports.getExceptionsReport = catchAsync(async (req, res, next) => {
  const { start_date, end_date } = req.query;
  const report = await reportService.getExceptionsReport(start_date, end_date);
  res.status(200).json({
    success: true,
    data: report
  });
});
