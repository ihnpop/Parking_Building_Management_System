const vehicleService = require('../services/vehicle.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getVehicleTypes = catchAsync(async (req, res, next) => {
  const types = await vehicleService.getVehicleTypes();
  res.status(200).json({
    success: true,
    data: types
  });
});

exports.createVehicleType = catchAsync(async (req, res, next) => {
  const newType = await vehicleService.createVehicleType(req.body);
  res.status(201).json({
    success: true,
    data: newType
  });
});

exports.updateVehicleType = catchAsync(async (req, res, next) => {
  const updated = await vehicleService.updateVehicleType(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: updated
  });
});

exports.deleteVehicleType = catchAsync(async (req, res, next) => {
  await vehicleService.deleteVehicleType(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Vehicle type configuration deleted successfully.'
  });
});
