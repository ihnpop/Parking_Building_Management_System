import * as monthCardService from "../service/monthCardService.js";
import supabase from "../config/supabaseClient.js";
import { generateNextMonthCode } from "../repositories/monthCardRepository.js";
import { uploadImageToVNPT, checkDocumentLiveness } from "../service/ekycService.js";

/**
 * Sinh mã thẻ MONTH tiếp theo chưa tồn tại trong DB
 * GET /api/month-card/next-code
 */
export const getNextMonthCode = async (req, res) => {
  try {
    const result = await monthCardService.getNextMonthCode();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Kiểm tra trạng thái biển số xe trước khi đi tiếp
 * POST /api/month-card/check-plate
 */
export const checkPlateStatus = async (req, res) => {
  try {
    const { plate } = req.body;
    const result = await monthCardService.checkPlateStatus(plate);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Lấy danh sách loại xe từ Supabase (vehicle_type)
 */
export const getVehicleTypes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_type')
      .select('vehicle_type_id, name')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPackages = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('package')
      .select('*')
      .eq('status', 'Hoạt động')
      .order('vehicle_type_id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy danh sách gói gia hạn thẻ tháng
 */
export const getRenewPackages = async (req, res) => {
  try {
    return res.status(200).json(monthCardService.RENEW_PACKAGES);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Thực hiện gia hạn thẻ tháng
 */
export const renewMonthlyCard = async (req, res) => {
  try {
    const { registrationId, months, note } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "Thiếu thông tin đăng ký (registrationId)." });
    }
    if (!months) {
      return res.status(400).json({ error: "Thiếu thông tin số tháng gia hạn." });
    }

    // Xác thực người thực hiện (performed_by) từ token JWT
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          currentUserId = user.id;
        }
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }

    // Fallback: nếu không lấy được userId từ token (ví dụ chạy dev/postman chưa gửi header)
    // thì lấy profile ID đầu tiên từ bảng profiles để tránh lỗi khóa ngoại (foreign key constraint)
    if (!currentUserId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        currentUserId = profiles[0].id;
      }
    }

    if (!currentUserId) {
      return res.status(401).json({ error: "Yêu cầu đăng nhập để thực hiện tác vụ này." });
    }

    const result = await monthCardService.renewMonthlyCard({
      registrationId,
      months: Number(months),
      note,
      currentUserId
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller gia hạn thẻ tháng:", err);
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Cập nhật thông tin thẻ tháng
 */
export const updateMonthCard = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await monthCardService.updateMonthCard(id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller cập nhật thẻ tháng:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Xóa mềm thẻ tháng theo ID
 * DELETE /api/month-card/:id
 * - Lấy id từ params, performedBy từ JWT user
 * - Ủy quyền xử lý nghiệp vụ cho monthCardService.deleteMonthCard
 * - Trả về HTTP 200 khi thành công, 404/500 khi thất bại
 */
export const deleteMonthCard = async (req, res) => {
  try {
    const { id } = req.params;                 // ID thẻ tháng cần xóa
    const performedBy = req.user?.id;          // ID người thực hiện (từ JWT middleware)

    const result = await monthCardService.deleteMonthCard(id, performedBy);
    return res.status(200).json({ message: 'Xóa vé tháng thành công', data: result });
  } catch (err) {
    console.error('deleteMonthCard error:', err);
    // Dùng err.statusCode (do service tự đặt) nếu có, fallback về 500
    return res.status(err.statusCode || 500).json({ message: err.message || 'Lỗi server' });
  }
};

/**
 * Lấy danh sách thẻ tháng
 */
export const getMonthCards = async (req, res) => {
  try {
    const monthCards = await monthCardService.getMonthCards();
    return res.status(200).json(monthCards);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy lịch sử giao dịch thẻ tháng
 */
export const getMonthCardLogs = async (req, res) => {
  try {
    const logs = await monthCardService.getMonthCardLogs();
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Xác thực giấy tờ thật giả (CCCD/CMND) qua VNPT eKYC
 * POST /api/month-card/verify-document
 */
export const verifyDocument = async (req, res) => {
  try {
    const { front_base64, back_base64 } = req.body;
    if (!front_base64) {
      return res.status(400).json({ error: "Thiếu ảnh mặt trước (front_base64)." });
    }

    console.log("Đang upload ảnh mặt trước lên VNPT...");
    // Tách phần prefix base64 nếu có (e.g. data:image/jpeg;base64,...)
    const cleanFrontBase64 = front_base64.replace(/^data:image\/\w+;base64,/, "");

    const frontHash = await uploadImageToVNPT(cleanFrontBase64, 'cccd_front');
    console.log("Upload mặt trước thành công, hash:", frontHash);

    console.log("Đang kiểm tra liveness mặt trước...");
    const livenessResult = await checkDocumentLiveness(frontHash);
    console.log("Kết quả liveness mặt trước:", livenessResult);

    let backHash = null;
    if (back_base64) {
      console.log("Đang upload ảnh mặt sau lên VNPT...");
      const cleanBackBase64 = back_base64.replace(/^data:image\/\w+;base64,/, "");
      backHash = await uploadImageToVNPT(cleanBackBase64, 'cccd_back');
      console.log("Upload mặt sau thành công, hash:", backHash);
    }

    return res.status(200).json({
      success: true,
      frontHash,
      backHash,
      isReal: livenessResult.isReal,
      liveness: livenessResult.liveness,
      liveness_msg: livenessResult.liveness_msg,
      face_swapping: livenessResult.face_swapping,
      fake_liveness: livenessResult.fake_liveness
    });
  } catch (err) {
    console.error("Lỗi xác thực giấy tờ:", err);
    return res.status(500).json({ error: err.message || "Lỗi xác thực giấy tờ từ VNPT eKYC" });
  }
};

/**
 * Đăng ký thẻ tháng mới
 */
export const createMonthCard = async (req, res) => {
  try {
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          currentUserId = user.id;
        }
      } catch (authErr) {
        console.error("Lỗi giải mã token:", authErr);
      }
    }

    if (!currentUserId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        currentUserId = profiles[0].id;
      }
    }

    const result = await monthCardService.createMonthCard({
      ...req.body,
      currentUserId
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller tạo thẻ tháng:", err);
    return res.status(400).json({ error: err.message });
  }
};

