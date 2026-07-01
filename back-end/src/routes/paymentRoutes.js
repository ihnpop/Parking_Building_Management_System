import express from "express";
import * as paymentController from "../controllers/paymentController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/checkout", verifyToken, paymentController.checkout);
router.post("/package", verifyToken, paymentController.packagePayment);
router.get("/vnpay-return", paymentController.vnpayReturn);
router.get("/vnpay-ipn", paymentController.vnpayIpn);
// Public: PaymentResultPage cần đọc giao dịch không cần đăng nhập
router.get("/:orderCode", paymentController.getPaymentByOrderCode);

export default router;