import express from "express";
import { getUsers, updateUserRole, getLoginLogs, inviteUserController } from "../controllers/userController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

/**
 * GET /api/users
 * Lấy danh sách tất cả người dùng kèm role (chỉ ADMIN)
 */
router.get("/", verifyToken, authorize("ADMIN"), getUsers);

/**
 * PATCH /api/users/:id/role
 * Cập nhật role cho người dùng (chỉ ADMIN)
 */
router.patch("/:id/role", verifyToken, authorize("ADMIN"), updateUserRole);

/**
 * GET /api/users/login-logs
 * Lấy danh sách nhật ký đăng nhập
 */
router.get("/login-logs", getLoginLogs);

// Chỉ admin mới được tạo user mới
router.post("/invite", verifyToken, authorize("ADMIN"), inviteUserController);

export default router;
