import { login } from "../service/loginService.js";

/**
 * POST /api/auth/login
 * Xử lý đăng nhập người dùng.
 */
export const loginHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ email và mật khẩu.",
      });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip;
    const userAgent = req.headers["user-agent"] || "";

    const data = await login({ email, password, ip, userAgent });

    return res.json(data);
  } catch (err) {
    next(err); // Để global error handler xử lý
  }
};
