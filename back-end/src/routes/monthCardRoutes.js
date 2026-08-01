import express from "express";
import * as monthCardController from "../controllers/monthCardController.js";
import * as registrationController from "../controllers/parkingRegistrationController.js";
import * as renewalController from "../controllers/renewalController.js";

const router = express.Router();

/**
 * GET /api/month-card/vehicle-types
 * Lấy danh sách loại xe
 */
router.get("/vehicle-types", monthCardController.getVehicleTypes);

/**
 * GET /api/month-card/packages
 * Lấy danh sách gói cước tháng
 */
router.get("/packages", monthCardController.getPackages);

/**
 * GET /api/month-card/next-code
 * Sinh mã thẻ MONTH tiếp theo chưa tồn tại trong DB
 */
router.get("/next-code", monthCardController.getNextMonthCode);

/**
 * POST /api/month-card/check-plate
 * Kiểm tra trạng thái biển số xe trước khi đi tiếp
 */
router.post("/check-plate", monthCardController.checkPlateStatus);

/**
 * GET /api/month-card
 * Lấy danh sách thẻ tháng
 */
router.get("/", monthCardController.getMonthCards);

/**
 * GET /api/month-card/logs
 * Lấy lịch sử giao dịch thẻ tháng
 */
router.get("/logs", monthCardController.getMonthCardLogs);

/**
 * GET /api/month-card/pending-registration
 * BƯỚC 4 & 5: Kiểm tra giao dịch đăng ký vé tháng đang chờ thanh toán hoặc chưa hoàn tất
 */
router.get("/pending-registration", registrationController.getPendingRegistration);

/**
 * GET /api/month-card/renew-packages
 * Lấy danh sách các gói gia hạn thẻ tháng khả dụng
 */
router.get("/renew-packages", monthCardController.getRenewPackages);

/**
 * POST /api/month-card/renew
 * Thực hiện gia hạn thẻ tháng (legacy - tiền mặt, staff thực hiện thủ công)
 */
router.post("/renew", monthCardController.renewMonthlyCard);

/**
 * POST /api/month-card/verify-document
 * Xác thực giấy tờ thật/giả bằng VNPT eKYC
 */
router.post("/verify-document", monthCardController.verifyDocument);

/**
 * POST /api/month-card/initiate-payment
 * BƯỚC 4: Tạo Customer/Vehicle/Package + khởi tạo giao dịch VNPay
 */
router.post("/initiate-payment", registrationController.initiatePayment);

/**
 * GET /api/month-card/payment-status/:orderCode
 * BƯỚC 4: Kiểm tra trạng thái thanh toán VNPay
 */
router.get("/payment-status/:orderCode", registrationController.getPaymentStatus);

/**
 * POST /api/month-card/confirm-cash-payment/:orderCode
 * BƯỚC 4: Xác nhận thu tiền mặt cho thẻ tháng
 */
router.post("/confirm-cash-payment/:orderCode", registrationController.confirmCashPayment);

/**
 * POST /api/month-card/finalize-registration
 * BƯỚC 5: Cấp thẻ RFID + Kích hoạt gói tháng
 */
router.post("/finalize-registration", registrationController.finalizeRegistration);

// ─────────────────────────────────────────────────────────────
// RENEWAL ROUTES (Gia hạn vé tháng qua VNPay / tiền mặt)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/month-card/initiate-renewal
 * Khởi tạo giao dịch gia hạn: trả về VNPay URL hoặc orderCode tiền mặt
 * Body: { cardId, packageId, paymentMethod: 'vnpay'|'cash' }
 */
router.post("/initiate-renewal", renewalController.initiateRenewal);

/**
 * POST /api/month-card/confirm-renewal-cash/:orderCode
 * Xác nhận thu tiền mặt gia hạn (dành cho cashier)
 */
router.post("/confirm-renewal-cash/:orderCode", renewalController.confirmRenewalCash);

/**
 * GET /api/month-card/renewal-status/:orderCode
 * Kiểm tra trạng thái giao dịch gia hạn
 */
router.get("/renewal-status/:orderCode", renewalController.getRenewalStatus);

/**
 * PUT /api/month-card/:id
 * Cập nhật thông tin thẻ tháng
 */
router.put("/:id", monthCardController.updateMonthCard);

/**
 * POST /api/month-card/create
 * Tạo mới thẻ tháng (đăng ký mới)
 */
router.post("/create", monthCardController.createMonthCard);

/**
 * DELETE /api/month-card/:id
 * Xóa mềm thẻ tháng (đánh dấu deleted_at, chuyển status sang "Đã khóa")
 */
router.delete("/:id", monthCardController.deleteMonthCard);

/**
 * GET /api/month-card/:cardId/renewal-info
 * Lấy thông tin gia hạn (phải đặt sau /logs, /next-code, etc. để tránh conflict)
 */
router.get("/:cardId/renewal-info", renewalController.getRenewalInfo);

/**
 * GET /api/month-card/:id/contract
 * Tải hợp đồng PDF của thẻ tháng
 */
router.get("/:id/contract", monthCardController.getContractPdf);

export default router;
