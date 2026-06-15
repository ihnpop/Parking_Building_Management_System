const sessionService = require('../services/session.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getSessions = catchAsync(async (req, res, next) => {
  const result = await sessionService.getSessions(req.pagination);
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

exports.getSessionById = catchAsync(async (req, res, next) => {
  const session = await sessionService.getSessionById(req.params.id);
  res.status(200).json({
    success: true,
    data: session
  });
});

exports.checkIn = catchAsync(async (req, res, next) => {
  const { slot_id, vehicle_type_id, license_plate } = req.body;

  if (!slot_id || !vehicle_type_id || !license_plate) {
    return next(new AppError('Missing check-in parameters: slot_id, vehicle_type_id, license_plate are required.', 400));
  }

  const result = await sessionService.checkIn({
    slot_id,
    vehicle_type_id,
    license_plate,
    check_in_staff_id: req.user.id
  });

  res.status(201).json({
    success: true,
    data: result
  });
});

exports.checkOut = catchAsync(async (req, res, next) => {
  const { ticket_code, license_plate } = req.body;

  if (!ticket_code && !license_plate) {
    return next(new AppError('Must provide either ticket_code or license_plate to check-out.', 400));
  }

  const result = await sessionService.checkOut({ ticket_code, license_plate });
  res.status(200).json({
    success: true,
    data: result
  });
});

exports.completeSession = catchAsync(async (req, res, next) => {
  const { payment_method, amount_paid } = req.body;

  if (!payment_method || amount_paid === undefined) {
    return next(new AppError('Payment method and amount paid parameters are required.', 400));
  }

  await sessionService.completeSession(req.params.id, {
    payment_method,
    amount_paid,
    check_out_staff_id: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Stay session finalized and slot freed successfully.'
  });
});

exports.recordException = catchAsync(async (req, res, next) => {
  const { exception_type, justification } = req.body;

  if (!exception_type || !justification) {
    return next(new AppError('Exception type and justification statement are required.', 400));
  }

  await sessionService.recordException(req.params.id, {
    exception_type,
    justification,
    staff_id: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Exception override logged and resolved successfully.'
  });
});
