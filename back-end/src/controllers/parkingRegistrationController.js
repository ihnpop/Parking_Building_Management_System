import registrationService from '../service/parkingRegistrationService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import { getUserIdFromReq } from '../helpers/authHelper.js';

/**
 * [Legacy] Xử lý toàn bộ luồng đăng ký thẻ tháng trong một bước
 */
class ParkingRegistrationController {
  async registerMonthlyTicket(req, res) {
    try {
      const result = await registrationService.processFullMonthlyRegistration(req.body);
      return res.status(200).json({
        success: true,
        message: "Quy trình đăng ký xe tháng hoàn tất thành công!",
        data: result
      });
    } catch (error) {
      console.error("Lỗi đăng ký thẻ tháng:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Luồng đăng ký thẻ tháng gặp sự cố."
      });
    }
  }
}

export default new ParkingRegistrationController();

// ─────────────────────────────────────────────────────────────
// PAYMENT FLOW CONTROLLERS (tách từ monthCardController.js)
// ─────────────────────────────────────────────────────────────

/**
 * BƯỚC 4: Khởi tạo đăng ký + Tạo giao dịch VNPay (hoặc ghi nhận tiền mặt)
 * POST /api/month-card/initiate-payment
 * Body: { customer_info, vehicle_info, package_id, payment_method }
 */
export const initiatePayment = async (req, res) => {
  try {
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;
    const origin = req.headers['origin'] || req.headers['referer'];

    const userId = await getUserIdFromReq(req);

    const result = await registrationService.initiateRegistration({
      ...req.body,
      ip_addr: ipAddrClean,
      created_by: userId,
      origin
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Lỗi initiatePayment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 4 & 5: Kiểm tra và lấy giao dịch đăng ký thẻ tháng đang chờ thanh toán
 * hoặc đã thanh toán nhưng chưa hoàn tất đăng ký
 * GET /api/month-card/pending-registration
 */
export const getPendingRegistration = async (req, res) => {
  try {
    const userId = await getUserIdFromReq(req);

    if (!userId) {
      return res.status(201).json({ success: true, pending: null });
    }

    const pm = await registrationService.getPendingRegistration(userId);

    if (!pm) {
      return res.status(200).json({ success: true, pending: null });
    }


    // Parse note
    let noteObj = null;
    try {
      noteObj = JSON.parse(pm.note);
    } catch (e) {
      console.error("Lỗi parse note của pending payment:", e);
    }

    if (!noteObj) {
      return res.status(200).json({ success: true, pending: null });
    }

    // Sinh lại payUrl nếu là VNPay và status là Chờ thanh toán
    let payUrl = null;
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;

    const methodLower = pm.payment_method === 'VNPay' ? 'vnpay' : 'cash';

    if (methodLower === 'vnpay' && pm.status === 'Chờ thanh toán') {
      const vnpayService = await import('../service/vnpayService.js');
      const rawPlate = noteObj.vehicle_info?.plate_number || 'xe';
      const origin = req.headers['origin'] || req.headers['referer'];
      payUrl = vnpayService.createPaymentUrl({
        orderCode: pm.order_code,
        amount: pm.amount,
        orderInfo: `Dang ky ve thang ${rawPlate}`,
        ipAddr: ipAddrClean,
        origin
      });
    }

    return res.status(200).json({
      success: true,
      pending: {
        orderCode: pm.order_code,
        amount: pm.amount,
        status: pm.status === 'Đã thanh toán' ? 'paid' : 'pending',
        paymentMethod: methodLower,
        payUrl,
        registrationData: noteObj,
        paymentTime: pm.payment_time
      }
    });

  } catch (err) {
    console.error("Lỗi getPendingRegistration:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 4: Kiểm tra trạng thái thanh toán VNPay theo orderCode
 * GET /api/month-card/payment-status/:orderCode
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    return res.status(200).json({ status: payment.status, orderCode });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * BƯỚC 4: Xác nhận thu tiền mặt cho thẻ tháng
 * POST /api/month-card/confirm-cash-payment/:orderCode
 */
export const confirmCashPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const result = await registrationService.confirmCashPayment(orderCode);
    return res.status(200).json({ success: true, message: 'Xác nhận thu tiền mặt thành công!', data: result });
  } catch (err) {
    console.error("Lỗi confirmCashPayment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 5: Cấp thẻ RFID + Kích hoạt gói tháng + Hoàn tất đăng ký
 * POST /api/month-card/finalize-registration
 * Body: { vehiclePackageId, card_code, payment_method, orderCode }
 */
export const finalizeRegistration = async (req, res) => {
  try {
    const result = await registrationService.finalizeRegistration(req.body);
    return res.status(200).json({ success: true, message: 'Đăng ký thẻ tháng hoàn tất!', data: result });
  } catch (err) {
    console.error("Lỗi finalizeRegistration:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};