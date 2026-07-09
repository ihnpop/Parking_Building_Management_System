import express from "express";
import * as controller from "../controllers/cardController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Đọc dữ liệu: chỉ yêu cầu đăng nhập, không giới hạn role cụ thể
// (nhân viên nào cũng cần xem được danh sách thẻ / nhật ký mất thẻ)
router.get("/card", controller.getCards);
router.get("/lost-card", controller.getLostCards);
router.get('/lost-logs', controller.getLostLogs);

// Đăng ký các API cho việc quản lý mất thẻ (cần xác thực để lấy performedBy)
router.post('/lost-card', verifyToken, controller.createLostCard);
router.put('/lost-card/:reportId/accept', verifyToken, controller.acceptLostCard);
router.put('/lost-card/:reportId/resolve', verifyToken, controller.resolveLostCard);


router.post("/card", controller.createCard);

router.delete("/:id", controller.deleteCard);
router.put("/:id", controller.updateCard);
export default router;