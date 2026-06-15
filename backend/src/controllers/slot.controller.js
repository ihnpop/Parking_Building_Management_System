const slotService = require('../services/slot.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getSlots = catchAsync(async (req, res, next) => {
  const result = await slotService.getSlots(req.pagination);
  
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

exports.getSlotById = catchAsync(async (req, res, next) => {
  const slot = await slotService.getSlotById(req.params.id);
  res.status(200).json({
    success: true,
    data: slot
  });
});

exports.createSlot = catchAsync(async (req, res, next) => {
  const slot = await slotService.createSlot(req.body);
  res.status(201).json({
    success: true,
    data: slot
  });
});

exports.updateSlot = catchAsync(async (req, res, next) => {
  const slot = await slotService.updateSlot(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: slot
  });
});

exports.updateSlotStatus = catchAsync(async (req, res, next) => {
  const slot = await slotService.updateSlotStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    data: slot
  });
});

exports.deleteSlot = catchAsync(async (req, res, next) => {
  await slotService.deleteSlot(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Slot deleted successfully.'
  });
});
