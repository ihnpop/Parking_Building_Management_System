const vehicleRepository = require('../repositories/vehicle.repository');
const AppError = require('../utils/app-error');

class VehicleService {
  async getVehicleTypes() {
    return await vehicleRepository.getAll();
  }

  async createVehicleType(vehicleData) {
    if (!vehicleData.code || !vehicleData.display_name) {
      throw new AppError('Vehicle code and display name are required.', 400);
    }
    return await vehicleRepository.create(vehicleData);
  }

  async updateVehicleType(id, updateData) {
    return await vehicleRepository.update(id, updateData);
  }

  async deleteVehicleType(id) {
    return await vehicleRepository.delete(id);
  }
}

module.exports = new VehicleService();
