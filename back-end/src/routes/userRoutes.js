import express from "express";
import { getUsers, updateUserRole, updateUserProfile, getLoginLogs, inviteUserController } from "../controllers/userController.js";
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
 * PATCH /api/users/:id/profile
 * Cập nhật thông tin cơ bản: phone, full_name, status (chỉ ADMIN)
 */
router.patch("/:id/profile", verifyToken, authorize("ADMIN"), updateUserProfile);

/**
 * GET /api/users/login-logs
 * Lấy danh sách nhật ký đăng nhập
 */
router.get("/login-logs", getLoginLogs);

// Chỉ admin mới được tạo user mới
router.post("/invite", verifyToken, authorize("ADMIN"), inviteUserController);

export default router;
