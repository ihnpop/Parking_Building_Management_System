const buildingRepository = require('../repositories/building.repository');
const AppError = require('../utils/app-error');

class BuildingService {
  async getBuildings() {
    return await buildingRepository.getAllBuildings();
  }

  async createBuilding(buildingData) {
    if (!buildingData.name) {
      throw new AppError('Building name is required.', 400);
    }
    return await buildingRepository.createBuilding(buildingData);
  }

  async updateBuilding(id, updateData) {
    return await buildingRepository.updateBuilding(id, updateData);
  }

  async getFloors(buildingId) {
    if (!buildingId) throw new AppError('Building ID is required.', 400);
    return await buildingRepository.getFloorsByBuilding(buildingId);
  }

  async createFloor(buildingId, floorData) {
    if (floorData.floor_number === undefined) {
      throw new AppError('Floor number is required.', 400);
    }
    return await buildingRepository.createFloor({
      building_id: buildingId,
      floor_number: floorData.floor_number,
      floor_name: floorData.floor_name || `Floor ${floorData.floor_number}`
    });
  }

  async getZones(floorId) {
    if (!floorId) throw new AppError('Floor ID is required.', 400);
    return await buildingRepository.getZonesByFloor(floorId);
  }

  async createZone(floorId, zoneData) {
    if (!zoneData.name) {
      throw new AppError('Zone name is required.', 400);
    }
    return await buildingRepository.createZone({
      floor_id: floorId,
      name: zoneData.name
    });
  }
}

module.exports = new BuildingService();
