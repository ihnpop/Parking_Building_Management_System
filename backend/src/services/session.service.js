const sessionRepository = require('../repositories/session.repository');
const slotRepository = require('../repositories/slot.repository');
const pricingService = require('./pricing.service');
const paymentService = require('./payment.service');
const AppError = require('../utils/app-error');

class SessionService {
  /**
   * Start parking session and reserve slot
   */
  async checkIn({ slot_id, vehicle_type_id, license_plate, check_in_staff_id }) {
    // 1) Verify target slot availability status
    const slot = await slotRepository.getById(slot_id);
    if (!slot) {
      throw new AppError('The requested slot does not exist.', 404);
    }
    if (slot.status !== 'AVAILABLE') {
      throw new AppError(`Cannot check-in: slot ${slot.slot_code} is currently ${slot.status.toLowerCase()}.`, 400);
    }

    // 2) Generate a unique human-readable ticket code
    const shortTs = Date.now().toString().slice(-6);
    const cleanPlateSnippet = license_plate.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const ticketCode = `TKT-${slot.slot_code}-${cleanPlateSnippet}-${shortTs}`;

    // 3) Perform slot occupancy update status
    await slotRepository.updateStatus(slot_id, 'OCCUPIED');

    try {
      // 4) Insert parking session transaction record
      const session = await sessionRepository.createSession({
        slot_id,
        vehicle_type_id,
        ticket_code: ticketCode,
        license_plate,
        check_in_staff_id
      });

      return {
        session_id: session.id,
        ticket_code: session.ticket_code,
        check_in_time: session.check_in_time,
        assigned_slot: {
          id: slot.id,
          slot_code: slot.slot_code
        }
      };
    } catch (err) {
      // Rollback slot status to AVAILABLE if transaction fails
      await slotRepository.updateStatus(slot_id, 'AVAILABLE');
      throw err;
    }
  }

  /**
   * Fetch active session calculations on check-out
   */
  async checkOut({ ticket_code, license_plate }) {
    // 1) Fetch target active session record
    const session = await sessionRepository.getActiveByCodeOrPlate({ ticket_code, license_plate });
    if (!session) {
      throw new AppError('No active parking stay session matching credentials was found.', 404);
    }

    // 2) Calculate pricing fee
    const checkOutTime = new Date().toISOString();
    const billing = await pricingService.calculateFee(
      session.check_in_time,
      checkOutTime,
      session.vehicle_type_id
    );

    return {
      session_id: session.id,
      license_plate: session.license_plate,
      ticket_code: session.ticket_code,
      check_in_time: session.check_in_time,
      check_out_time: checkOutTime,
      elapsed_minutes: billing.elapsedMinutes,
      calculated_amount: billing.amount,
      pricing_policy: {
        base_price: billing.policy.base_price,
        hourly_rate: billing.policy.hourly_rate,
        grace_period_minutes: billing.policy.grace_period_minutes
      }
    };
  }

  /**
   * Finalize transaction stay, save payments, and release slot space
   */
  async completeSession(id, { payment_method, amount_paid, check_out_staff_id }) {
    // 1) Retrieve session and verify eligibility
    const session = await sessionRepository.getById(id);
    if (!session || session.status !== 'ACTIVE') {
      throw new AppError('Stay session is not active or has already been closed.', 400);
    }

    const checkOutTime = new Date().toISOString();

    // 2) Close stay session status columns
    await sessionRepository.closeSession(id, {
      check_out_time: checkOutTime,
      check_out_staff_id,
      status: 'COMPLETED'
    });

    // 3) Create payments log audit record via payment service
    await paymentService.processPayment({
      session_id: id,
      amount: amount_paid,
      status: 'PAID',
      method: payment_method
    });

    // 4) Set slot status back to AVAILABLE
    await slotRepository.updateStatus(session.slot_id, 'AVAILABLE');

    return { success: true };
  }

  /**
   * Handle manual overrides with waiver exceptions logs
   */
  async recordException(id, { exception_type, justification, staff_id }) {
    const session = await sessionRepository.getById(id);
    if (!session) {
      throw new AppError('Target stay session not found.', 404);
    }

    // 1) Log the exception override justification
    await sessionRepository.logException({
      session_id: id,
      staff_id,
      exception_type,
      justification
    });

    // 2) If the ticket was waived, update status to COMPLETED and payments to WAIVED
    if (exception_type === 'LOST_TICKET' || exception_type === 'MANUAL_OVERRIDE') {
      await sessionRepository.closeSession(id, {
        check_out_time: new Date().toISOString(),
        check_out_staff_id: staff_id,
        status: 'COMPLETED'
      });

      await paymentService.processPayment({
        session_id: id,
        amount: 0.00,
        status: 'WAIVED',
        method: 'CASH'
      });

      await slotRepository.updateStatus(session.slot_id, 'AVAILABLE');
    }

    return { success: true };
  }

  async getSessions(paginationOptions) {
    return await sessionRepository.getAll(paginationOptions);
  }

  async getSessionById(id) {
    return await sessionRepository.getById(id);
  }
}

module.exports = new SessionService();
