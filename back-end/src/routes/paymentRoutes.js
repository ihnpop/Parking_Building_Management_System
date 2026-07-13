/**
 * paymentRoutes.js
 * Định nghĩa các endpoints định tuyến liên quan đến cổng thanh toán VNPay và Hóa đơn.
 */

import express from "express";
import * as paymentController from "../controllers/paymentController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// 1. Tạo hóa đơn thanh toán cho vé lượt (Yêu cầu đăng nhập verifyToken)
router.post("/checkout", verifyToken, paymentController.checkout);

// 2. Tạo hóa đơn thanh toán cho vé tháng (Đăng ký mới/Gia hạn) (Yêu cầu đăng nhập verifyToken)
router.post("/package", verifyToken, paymentController.packagePayment);

// 3. Đường dẫn tiếp nhận kết quả phản hồi hiển thị trên Client khi VNPay điều hướng về (Công khai)
router.get("/vnpay-return", paymentController.vnpayReturn);

// 4. Đường dẫn nhận kết quả IPN xác thực ngầm gửi trực tiếp từ Server VNPay sang (Công khai)
router.get("/vnpay-ipn", paymentController.vnpayIpn);

// 5. Đường dẫn truy vấn thông tin hóa đơn theo mã giao dịch orderCode (Công khai - dùng cho trang kết quả thanh toán)
router.get("/:orderCode", paymentController.getPaymentByOrderCode);

export default router;