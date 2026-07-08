import express from "express";
import * as controller from "../controllers/cardController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

// Đọc dữ liệu: chỉ yêu cầu đăng nhập, không giới hạn role cụ thể
// (nhân viên nào cũng cần xem được danh sách thẻ / nhật ký mất thẻ)
router.get("/card", verifyToken, controller.getCards);
router.get("/lost-card", verifyToken, controller.getLostCards);
router.get('/lost-logs', verifyToken, controller.getLostLogs);

// Đăng ký các API cho việc quản lý mất thẻ
router.post('/lost-card', verifyToken, controller.createLostCard);

router.post("/card", verifyToken, controller.createCard);

// Chỉ ADMIN được phép xóa thẻ - đây là thao tác hủy dữ liệu, cần quyền cao nhất.
router.delete("/:id", verifyToken, authorize('ADMIN'), controller.deleteCard);

router.put("/:id", verifyToken, controller.updateCard);
export default router;