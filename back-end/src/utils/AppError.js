/**
 * Custom Error class cho toàn bộ ứng dụng.
 * Thay thế pattern Object.assign(new Error(...), { statusCode }) bị phân tán.
 *
 * Sử dụng:
 *   throw new AppError("Biển số xe là bắt buộc.", 400);
 */
export default class AppError extends Error {
  /**
   * @param {string} message  – Thông báo lỗi (hiển thị cho client)
   * @param {number} statusCode – HTTP status code (mặc định 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    // Giữ stack trace chính xác trên V8 (Node.js)
    Error.captureStackTrace?.(this, this.constructor);
  }
}
