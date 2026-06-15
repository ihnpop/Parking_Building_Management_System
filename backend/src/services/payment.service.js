const paymentRepository = require('../repositories/payment.repository');
const AppError = require('../utils/app-error');

class PaymentService {
  async getPayments(paginationOptions) {
    return await paymentRepository.getAll(paginationOptions);
  }

  async getPaymentById(id) {
    return await paymentRepository.getById(id);
  }

  /**
   * Record payment (invoked inside completeSession process flow)
   */
  async processPayment({ session_id, amount, status, method }) {
    if (!session_id || amount === undefined || !status || !method) {
      throw new AppError('Missing required properties to process payment.', 400);
    }
    return await paymentRepository.create({
      session_id,
      amount,
      status,
      method
    });
  }
}

module.exports = new PaymentService();
