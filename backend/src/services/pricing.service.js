const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

const pricingRepository = require('../repositories/pricing.repository');

class PricingService {
  /**
   * Calculate billing fee based on vehicle category stay duration
   * @param {string} checkInTime - Time check-in occurred
   * @param {string} checkOutTime - Time check-out occurred
   * @param {number} vehicleTypeId - Target vehicle type id
   * @returns {Promise<{amount: number, elapsedMinutes: number, policy: object}>}
   */
  async calculateFee(checkInTime, checkOutTime, vehicleTypeId) {
    // 1) Fetch active pricing policy for target vehicle category
    const { data: policy, error } = await supabase
      .from('pricing_policies')
      .select('*')
      .eq('vehicle_type_id', vehicleTypeId)
      .eq('is_active', true)
      .single();

    if (error || !policy) {
      throw new AppError('No active pricing policy configured for this vehicle category.', 404);
    }

    // 2) Parse dates and find total stay duration in minutes
    const start = new Date(checkInTime);
    const end = new Date(checkOutTime);
    const elapsedMs = Math.max(0, end - start);
    const elapsedMinutes = Math.ceil(elapsedMs / (1000 * 60));

    const { base_price, hourly_rate, day_cap, grace_period_minutes } = policy;

    // 3) Grace period check: Free stay if within window
    if (elapsedMinutes <= grace_period_minutes) {
      return { amount: 0.00, elapsedMinutes, policy };
    }

    // 4) Hourly stay math (rounded up to nearest hour)
    const billableHours = Math.ceil(elapsedMinutes / 60);
    let amount = parseFloat(base_price);

    if (billableHours > 1) {
      amount += (billableHours - 1) * parseFloat(hourly_rate);
    }

    // 5) Day Cap constraint check
    if (day_cap && amount > parseFloat(day_cap)) {
      amount = parseFloat(day_cap);
    }

    return {
      amount: Math.max(0, parseFloat(amount.toFixed(2))),
      elapsedMinutes,
      policy
    };
  }

  // === PRICING POLICY MANAGEMENT ===

  async getPolicies(paginationOptions) {
    return await pricingRepository.getAll(paginationOptions);
  }

  async getPolicyById(id) {
    return await pricingRepository.getById(id);
  }

  async createPolicy(policyData) {
    const { vehicle_type_id, base_price, hourly_rate } = policyData;
    if (!vehicle_type_id || base_price === undefined || hourly_rate === undefined) {
      throw new AppError('Missing required properties: vehicle_type_id, base_price, hourly_rate.', 400);
    }

    // 1) Deactivate old pricing rules for this category (enforcing snapshot state)
    await pricingRepository.deactivateByVehicleType(vehicle_type_id);

    // 2) Save the new active policy rules snapshot
    return await pricingRepository.create(policyData);
  }

  async deletePolicy(id) {
    return await pricingRepository.delete(id);
  }
}

module.exports = new PricingService();
