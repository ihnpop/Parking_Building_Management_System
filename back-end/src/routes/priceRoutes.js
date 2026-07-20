import { Router } from "express";
import { verifyToken, authorize } from "../middlewares/auth.js";
import {
    getPricesController,
    updateSessionPricesController,
    updateMonthlyPricesController,
} from "../controllers/priceController.js";

const router = Router();

// Tất cả endpoints về giá đều yêu cầu người dùng đăng nhập (Manager / Admin)
router.use(verifyToken, authorize("MANAGER", "ADMIN"));

router.get("/", getPricesController);
router.put("/session", updateSessionPricesController);
router.put("/monthly", updateMonthlyPricesController);

export default router;
