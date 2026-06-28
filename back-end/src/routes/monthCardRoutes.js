import express from "express";
import * as monthCardController from "../controllers/monthCardController.js";

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
 * GET /api/month-card/renew-packages
 * Lấy danh sách các gói gia hạn thẻ tháng khả dụng
 */
router.get("/renew-packages", monthCardController.getRenewPackages);


/**
 * POST /api/month-card/renew
 * Thực hiện gia hạn thẻ tháng
 */
router.post("/renew", monthCardController.renewMonthlyCard);

/**
 * POST /api/month-card/verify-document
 * Xác thực giấy tờ thật/giả bằng VNPT eKYC
 */
router.post("/verify-document", monthCardController.verifyDocument);


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

export default router;
