import * as gateService from "../service/gateService.js";
import * as ocrService from "../service/ocr.service.js";
import supabase from "../config/supabaseClient.js";
import { calculateExitFee } from "../service/feeCalculationService.js";

const BUCKET = "parking-images";

/**
 * POST /api/gate/upload
 * Tải ảnh camera lên Supabase Storage và trả về publicUrl.
 */
export const uploadImage = async (req, res) => {
  try {
    const file = req.file;
    const folder = req.body.folder || "gate/camera";

    if (!file) {
      return res.status(400).json({ success: false, message: "Thiếu file upload." });
    }

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "_");
    const storagePath = `${folder}/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        upsert: false,
        contentType: file.mimetype || "image/*",
      });

    if (uploadError) {
      throw new Error(`Lỗi tải ảnh lên Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    
    return res.status(200).json({
      success: true,
      publicUrl: data.publicUrl
    });
  } catch (err) {
    console.error("gateController.uploadImage error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Lỗi tải ảnh lên server."
    });
  }
};

/**
 * POST /api/gate/ocr
 * Nhận diện biển số xe thực tế từ hình ảnh tải lên sử dụng PaddleOCR qua ocrService.
 */
export const simulateOCR = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "Thiếu file biển số để OCR." });
    }

    // Gọi dịch vụ OCR thực tế bằng PaddleOCR
    const ocrResult = await ocrService.readPlate(file);

    if (ocrResult && ocrResult.success) {
      return res.status(200).json({
        success: true,
        plateNumber: ocrResult.plate
      });
    } else {
      return res.status(400).json({
        success: false,
        message: ocrResult?.message || "Nhận dạng biển số không thành công."
      });
    }
  } catch (err) {
    console.error("gateController.simulateOCR error:", err.response?.data || err);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message || "Lỗi xử lý OCR biển số."
    });
  }
};

/**
 * POST /api/gate/entry/pre-check
 */
export const preCheckEntry = async (req, res) => {
  try {
    const { plateNumber } = req.body;
    const result = await gateService.preCheckEntry(plateNumber);
    return res.status(200).json(result);
  } catch (err) {
    console.error("gateController.preCheckEntry error:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};

/**
 * POST /api/gate/entry
 */
export const entryTap = async (req, res) => {
  try {
    const { cardCode, plateNumber, entryVehicleImage, entryPlateImage, vehicleType, gateId, gate_id } = req.body;
    const staffId = req.user?.id;
    const resolvedGateId = gateId || gate_id;

    const result = await gateService.entryTap({
      cardCode,
      plateNumber,
      entryVehicleImage,
      entryPlateImage,
      vehicleType,
      staffId,
      gateId: resolvedGateId
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error("gateController.entryTap error:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};

/**
 * POST /api/gate/exit/pre-check
 */
export const preCheckExit = async (req, res) => {
  try {
    const { plateNumber } = req.body;
    const result = await gateService.preCheckExit(plateNumber);
    return res.status(200).json(result);
  } catch (err) {
    console.error("gateController.preCheckExit error:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};

/**
 * POST /api/gate/exit
 */
export const exitTap = async (req, res) => {
  try {
    const { cardCode, plateNumber, exitVehicleImage, exitPlateImage, gateId, gate_id } = req.body;
    const staffId = req.user?.id;
    const resolvedGateId = gateId || gate_id;

    const result = await gateService.exitTap({
      cardCode,
      plateNumber,
      exitVehicleImage,
      exitPlateImage,
      staffId,
      gateId: resolvedGateId
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("gateController.exitTap error:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error"
    });
  }
};

/**
 * GET /api/gate/stats?date=YYYY-MM-DD
 */
export const getStats = async (req, res) => {
  try {
    const dateStr = req.query.date || null; // 'YYYY-MM-DD' hoặc null (hôm nay)
    const stats = await gateService.getStats(dateStr);
    return res.status(200).json(stats);
  } catch (err) {
    console.error("gateController.getStats error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Lỗi lấy thống kê bãi xe."
    });
  }
};

/**
 * GET /api/gate/sessions?date=YYYY-MM-DD
 */
export const getSessions = async (req, res) => {
  try {
    const dateStr = req.query.date || null; // 'YYYY-MM-DD' hoặc null (hôm nay)
    const sessions = await gateService.getSessions(dateStr);
    return res.status(200).json(sessions);
  } catch (err) {
    console.error("gateController.getSessions error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Lỗi lấy danh sách phiên gửi xe."
    });
  }
};

/**
 * GET /api/gate/check-exit?plate_number=xxx
 * Kiểm tra xe ra và tính phí, KHÔNG tạo payment ở bước này.
 * Trả về đầy đủ thông tin để frontend hiển thị và quyết định phương thức thanh toán.
 */
export const checkExit = async (req, res) => {
  try {
    const { plate_number } = req.query;
    const result = await calculateExitFee({ plate_number });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("gateController.checkExit error:", err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Lỗi kiểm tra thông tin xe ra."
    });
  }
};

