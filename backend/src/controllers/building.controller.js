const buildingService = require('../services/building.service');
const AppError = require('../utils/app-error');

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

exports.getBuildings = catchAsync(async (req, res, next) => {
  const buildings = await buildingService.getBuildings();
  res.status(200).json({
    success: true,
    data: buildings
  });
});

exports.createBuilding = catchAsync(async (req, res, next) => {
  const building = await buildingService.createBuilding(req.body);
  res.status(201).json({
    success: true,
    data: building
  });
});

exports.updateBuilding = catchAsync(async (req, res, next) => {
  const building = await buildingService.updateBuilding(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: building
  });
});

exports.getFloors = catchAsync(async (req, res, next) => {
  const floors = await buildingService.getFloors(req.params.buildingId);
  res.status(200).json({
    success: true,
    data: floors
  });
});

exports.createFloor = catchAsync(async (req, res, next) => {
  const floor = await buildingService.createFloor(req.params.buildingId, req.body);
  res.status(201).json({
    success: true,
    data: floor
  });
});

exports.getZones = catchAsync(async (req, res, next) => {
  const zones = await buildingService.getZones(req.params.floorId);
  res.status(200).json({
    success: true,
    data: zones
  });
});

exports.createZone = catchAsync(async (req, res, next) => {
  const zone = await buildingService.createZone(req.params.floorId, req.body);
  res.status(201).json({
    success: true,
    data: zone
  });
});
