import * as contractService from "../service/contractService.js";

/**
 * Gửi email yêu cầu ký hợp đồng
 * POST /api/contracts/send
 */
export const sendContractEmail = async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({ error: "Thiếu thông tin đăng ký (registrationId)." });
    }

    const result = await contractService.sendContract(registrationId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller gửi email hợp đồng:", err);
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Lấy chi tiết hợp đồng để hiển thị trước khi ký (Public)
 * GET /api/contracts/sign/:token
 */
export const getContractDetails = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "Mã token không hợp lệ." });
    }

    const result = await contractService.getContractByToken(token);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller lấy chi tiết hợp đồng:", err);
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Xác nhận ký hợp đồng (Public)
 * POST /api/contracts/sign/:token
 */
export const signContract = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "Mã token không hợp lệ." });
    }

    // Lấy IP client
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const cleanIp = (ip === '::1' || ip.includes('::ffff:')) ? '127.0.0.1' : ip;

    const result = await contractService.signContract(token, cleanIp);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller ký hợp đồng:", err);
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Lấy trạng thái hợp đồng theo registrationId
 * GET /api/contracts/status/:registrationId
 */
export const getContractStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    if (!registrationId) {
      return res.status(400).json({ error: "Thiếu thông tin đăng ký (registrationId)." });
    }

    const result = await contractService.getContractStatus(registrationId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller lấy trạng thái hợp đồng:", err);
    return res.status(500).json({ error: err.message });
  }
};
