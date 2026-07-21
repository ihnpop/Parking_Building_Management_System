import AppError from "../utils/AppError.js";

/**
 * Global error-handling middleware.
 * Đặt ở cuối chuỗi app.use() trong server.js.
 *
 * Lợi ích:
 *  - Controller / Service chỉ cần throw AppError, không cần try-catch res.status(...)
 *  - Format response nhất quán trên toàn bộ API
 *  - Log đầy đủ error stack trong môi trường development
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Nếu là AppError do ta throw → dùng statusCode đã gán
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode || 500);

  // Production không nên trả stack trace
  const isProduction = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    console.error(`[ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
