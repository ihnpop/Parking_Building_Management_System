const slotRepository = require('../repositories/slot.repository');
const AppError = require('../utils/app-error');

class SlotService {
  async getSlots(paginationOptions) {
    return await slotRepository.getAll(paginationOptions);
  }

  async getSlotById(id) {
    return await slotRepository.getById(id);
  }

  async createSlot(slotData) {
    if (!slotData.zone_id || !slotData.slot_code) {
      throw new AppError('Zone ID and Slot Code are required properties.', 400);
    }
    return await slotRepository.create(slotData);
  }

  async updateSlot(id, updateData) {
    return await slotRepository.update(id, updateData);
  }

  async updateSlotStatus(id, status) {
    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid slot status. Allowed statuses: ${validStatuses.join(', ')}`, 400);
    }

    // Business rule checks
    const slot = await slotRepository.getById(id);
    if (slot.status === 'OCCUPIED' && status === 'MAINTENANCE') {
      throw new AppError('Cannot flag slot under maintenance: Spot is currently occupied by a vehicle.', 400);
    }

    return await slotRepository.updateStatus(id, status);
  }

  async deleteSlot(id) {
    return await slotRepository.delete(id);
  }
}

module.exports = new SlotService();
