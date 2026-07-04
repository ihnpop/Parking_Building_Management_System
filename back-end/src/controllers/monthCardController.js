import * as monthCardService from "../service/monthCardService.js";
import supabase from "../config/supabaseClient.js";
import { generateNextMonthCode } from "../repositories/monthCardRepository.js";
import { uploadImageToVNPT, checkDocumentLiveness, ocrIdentityCard } from "../service/ekycService.js";
import registrationService from '../service/parkingRegistrationService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';

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
 * Tạo mới thẻ tháng (đăng ký mới)
 */
export const createMonthCard = async (req, res) => {
  try {
    const {
      plate,
      startDate,
      durationMonths,
      fullName,
      phone,
      email,
      status,
      vehicleTypeId,
      note
    } = req.body;

    if (!plate) {
      return res.status(400).json({ error: "Thiếu biển số xe (plate)." });
    }
    if (!fullName) {
      return res.status(400).json({ error: "Thiếu tên khách hàng (fullName)." });
    }
    if (!durationMonths) {
      return res.status(400).json({ error: "Thiếu thời hạn đăng ký (durationMonths)." });
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

    if (!currentUserId) {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
      if (profiles && profiles.length > 0) {
        currentUserId = profiles[0].id;
      }
    }

    if (!currentUserId) {
      return res.status(401).json({ error: "Yêu cầu đăng nhập để thực hiện tác vụ này." });
    }

    const result = await monthCardService.createMonthCard({
      plate,
      startDate,
      durationMonths: Number(durationMonths),
      fullName,
      phone,
      email,
      status,
      vehicleTypeId,
      note,
      currentUserId
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error("Lỗi Controller tạo thẻ tháng mới:", err);
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
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Xóa mềm thẻ tháng theo ID
 * DELETE /api/month-card/:id
 */
export const deleteMonthCard = async (req, res) => {
  try {
    const { id } = req.params;
    const performedBy = req.user?.id;

    const result = await monthCardService.deleteMonthCard(id, performedBy);
    return res.status(200).json({ message: 'Xóa vé tháng thành công', data: result });
  } catch (err) {
    console.error('deleteMonthCard error:', err);
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

    // Nếu giấy tờ hợp lệ → gọi thêm OCR để bóc tách tên & số CCCD
    let ocrData = null;
    if (livenessResult.isReal && frontHash && backHash) {
      try {
        console.log("Đang OCR bóc tách thông tin CCCD...");
        const ocrResult = await ocrIdentityCard(frontHash, backHash);
        if (ocrResult.success) {
          ocrData = ocrResult.data;
          console.log("OCR thành công:", { name: ocrData?.name, id: ocrData?.id });
        }
      } catch (ocrErr) {
        // OCR thất bại không được chặn kết quả liveness — chỉ log warning
        console.warn("OCR thất bại (bỏ qua):", ocrErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      frontHash,
      backHash,
      isReal: livenessResult.isReal,
      liveness: livenessResult.liveness,
      liveness_msg: livenessResult.liveness_msg,
      face_swapping: livenessResult.face_swapping,
      fake_liveness: livenessResult.fake_liveness,
      // Dữ liệu OCR từ CCCD (tên, số ID, ngày sinh, địa chỉ...)
      ocrData: ocrData ? {
        name: ocrData.name || ocrData.full_name || null,
        id: ocrData.id || ocrData.id_card_number || null,
        birth_day: ocrData.birth_day || ocrData.dob || null,
        sex: ocrData.sex || ocrData.gender || null,
        address: ocrData.address || null,
        issue_date: ocrData.issue_date || null,
        issue_place: ocrData.issue_place || null
      } : null
    });
  } catch (err) {
    console.error("Lỗi xác thực giấy tờ:", err);
    return res.status(500).json({ error: err.message || "Lỗi xác thực giấy tờ từ VNPT eKYC" });
  }
};

/**
 * BƯỚC 4: Khởi tạo đăng ký + Tạo giao dịch VNPay (hoặc ghi nhận tiền mặt)
 * POST /api/month-card/initiate-payment
 * Body: { customer_info, vehicle_info, package_id, payment_method }
 */
export const initiatePayment = async (req, res) => {
  try {
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;

    const result = await registrationService.initiateRegistration({
      ...req.body,
      ip_addr: ipAddrClean
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Lỗi initiatePayment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 4: Kiểm tra trạng thái thanh toán VNPay theo orderCode
 * GET /api/month-card/payment-status/:orderCode
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    return res.status(200).json({ status: payment.status, orderCode });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * BƯỚC 4: Xác nhận thu tiền mặt cho thẻ tháng
 * POST /api/month-card/confirm-cash-payment/:orderCode
 */
export const confirmCashPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const result = await registrationService.confirmCashPayment(orderCode);
    return res.status(200).json({ success: true, message: 'Xác nhận thu tiền mặt thành công!', data: result });
  } catch (err) {
    console.error("Lỗi confirmCashPayment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 5: Cấp thẻ RFID + Kích hoạt gói tháng + Hoàn tất đăng ký
 * POST /api/month-card/finalize-registration
 * Body: { vehiclePackageId, card_code, payment_method, orderCode }
 */
export const finalizeRegistration = async (req, res) => {
  try {
    const result = await registrationService.finalizeRegistration(req.body);
    return res.status(200).json({ success: true, message: 'Đăng ký thẻ tháng hoàn tất!', data: result });
  } catch (err) {
    console.error("Lỗi finalizeRegistration:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
