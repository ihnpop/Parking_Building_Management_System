import express from "express";
import { getUsers, updateUserRole, getLoginLogs, inviteUserController } from "../controllers/userController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

/**
 * GET /api/users
 * Lấy danh sách tất cả người dùng kèm role
 */
router.get("/", getUsers);

/**
 * PATCH /api/users/:id/role
 * Cập nhật role cho người dùng
 */
router.patch("/:id/role", updateUserRole);

/**
 * GET /api/users/login-logs
 * Lấy danh sách nhật ký đăng nhập
 */
router.get("/login-logs", verifyToken, getLoginLogs);

// Chỉ admin mới được tạo user mới
router.post("/invite", verifyToken, authorize("ADMIN"), inviteUserController);

export default router;
