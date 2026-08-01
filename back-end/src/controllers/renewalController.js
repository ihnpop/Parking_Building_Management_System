import * as renewalService from '../service/renewalService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import { getUserIdFromReq } from '../helpers/authHelper.js';

/**
 * Lấy thông tin gia hạn: trạng thái thẻ, thời hạn hiện tại, danh sách gói khả dụng.
 * GET /api/month-card/:cardId/renewal-info
 */
export const getRenewalInfo = async (req, res) => {
  try {
    const { cardId } = req.params;
    if (!cardId) return res.status(400).json({ error: 'Thiếu cardId.' });

    const userId = await getUserIdFromReq(req);
    const origin = req.headers['origin'] || req.headers['referer'];

    const info = await renewalService.getRenewalInfo(cardId, userId, origin);
    return res.status(200).json({ success: true, data: info });
  } catch (err) {
    console.error('getRenewalInfo error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * Khởi tạo giao dịch gia hạn: tạo payment record + VNPay URL (hoặc cash orderCode).
 * POST /api/month-card/initiate-renewal
 * Body: { cardId, packageId, paymentMethod: 'vnpay'|'cash' }
 */
export const initiateRenewal = async (req, res) => {
  try {
    const { cardId, packageId, paymentMethod } = req.body;
    if (!cardId) return res.status(400).json({ error: 'Thiếu cardId.' });
    if (!packageId) return res.status(400).json({ error: 'Thiếu packageId.' });
    if (!paymentMethod || !['vnpay', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ ('vnpay' hoặc 'cash')." });
    }

    // Lấy IP của client
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;

    const userId = await getUserIdFromReq(req);

    const result = await renewalService.initiateRenewal({
      cardId,
      packageId,
      paymentMethod,
      ipAddr: ipAddrClean,
      userId,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('initiateRenewal error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * Xác nhận thu tiền mặt gia hạn (dành cho cashier).
 * POST /api/month-card/confirm-renewal-cash/:orderCode
 */
export const confirmRenewalCash = async (req, res) => {
  try {
    const { orderCode } = req.params;
    if (!orderCode) return res.status(400).json({ error: 'Thiếu orderCode.' });
    const result = await renewalService.confirmRenewalCash(orderCode);
    return res.status(200).json({ success: true, message: 'Gia hạn thẻ tháng thành công!', data: result });
  } catch (err) {
    console.error('confirmRenewalCash error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * Kiểm tra trạng thái giao dịch gia hạn theo orderCode.
 * GET /api/month-card/renewal-status/:orderCode
 */
export const getRenewalStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    return res.status(200).json({
      success: true,
      data: {
        orderCode: payment.order_code,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paid_at,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
