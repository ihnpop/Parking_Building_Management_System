import * as monthCardService from "../service/monthCardService.js";
import supabase from "../config/supabaseClient.js";
import { resolveBuildingIdFromReq } from "../middlewares/auth.js";
import { generateNextMonthCode } from "../repositories/monthCardRepository.js";
import { uploadImageToVNPT, checkDocumentLiveness, ocrIdentityCard } from "../service/ekycService.js";
import registrationService from '../service/parkingRegistrationService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as renewalService from '../service/renewalService.js';
import PDFDocument from "pdfkit";
import fs from "fs";


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
    // Lấy userId từ token JWT
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }

    let query = supabase
      .from('package')
      .select('*')
      .eq('status', 'Hoạt động');

    if (userId) {
      // 1. Lấy building_id từ profiles của user
      const { data: profile } = await supabase
        .from('profiles')
        .select('building_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.building_id) {
        // 2. Tìm tất cả parking thuộc building này
        const { data: parkings } = await supabase
          .from('parking')
          .select('parking_id')
          .eq('building_id', profile.building_id);

        const parkingIds = parkings?.map(p => p.parking_id) || [];
        if (parkingIds.length > 0) {
          // 3. Tìm tất cả price_table thuộc các parking_id trên
          const { data: priceTables } = await supabase
            .from('price_table')
            .select('price_table_id')
            .in('parking_id', parkingIds);

          const priceTableIds = priceTables?.map(pt => pt.price_table_id) || [];
          if (priceTableIds.length > 0) {
            // Lọc theo price_table_id hoặc price_table_id is null (để không mất các package cũ)
            query = query.or(`price_table_id.is.null,price_table_id.in.(${priceTableIds.map(id => `"${id}"`).join(',')})`);
          } else {
            // Nếu có bãi đỗ xe nhưng không có price table, chỉ hiển thị package global
            query = query.is('price_table_id', null);
          }
        } else {
          query = query.is('price_table_id', null);
        }
      } else {
        query = query.is('price_table_id', null);
      }
    }

    const { data, error } = await query.order('vehicle_type_id');

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
      note,
      cccdNumber,
      cccd_number
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
      currentUserId,
      cccdNumber,
      cccd_number
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
    const buildingId = await resolveBuildingIdFromReq(req);
    const monthCards = await monthCardService.getMonthCards(buildingId);
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
    const buildingId = await resolveBuildingIdFromReq(req);
    const logs = await monthCardService.getMonthCardLogs(buildingId);
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
    const origin = req.headers['origin'] || req.headers['referer'];

    // Lấy userId từ token JWT
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }

    if (!userId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id;
      }
    }

    const result = await registrationService.initiateRegistration({
      ...req.body,
      ip_addr: ipAddrClean,
      created_by: userId,
      origin
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Lỗi initiatePayment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * BƯỚC 4 & 5: Kiểm tra và lấy giao dịch đăng ký vé tháng đang chờ thanh toán hoặc đã thanh toán nhưng chưa hoàn tất đăng ký
 * GET /api/month-card/pending-registration
 */
export const getPendingRegistration = async (req, res) => {
  try {
    // 1. Lấy userId từ token JWT
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }

    if (!userId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        userId = profiles[0].id;
      }
    }

    if (!userId) {
      return res.status(201).json({ success: true, pending: null });
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Tìm giao dịch Đăng ký vé tháng trong vòng 15 phút, thuộc về user hiện tại, chưa liên kết với package nào
    const { data: pm, error } = await supabase
      .from('payment')
      .select('*')
      .eq('payment_type', 'Đăng ký vé tháng')
      .in('status', ['Chờ thanh toán', 'Đã thanh toán'])
      .is('vehicle_package_id', null)
      .eq('created_by', userId)
      .gt('payment_time', fifteenMinutesAgo)
      .order('payment_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Lỗi truy vấn payment chờ thanh toán: " + error.message);
    }

    if (!pm) {
      return res.status(200).json({ success: true, pending: null });
    }

    // Parse note
    let noteObj = null;
    try {
      noteObj = JSON.parse(pm.note);
    } catch (e) {
      console.error("Lỗi parse note của pending payment:", e);
    }

    if (!noteObj) {
      return res.status(200).json({ success: true, pending: null });
    }

    // Sinh lại payUrl nếu là VNPay và status là Chờ thanh toán
    let payUrl = null;
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;
    
    const methodLower = pm.payment_method === 'VNPay' ? 'vnpay' : 'cash';

    if (methodLower === 'vnpay' && pm.status === 'Chờ thanh toán') {
      const vnpayService = await import('../service/vnpayService.js');
      const rawPlate = noteObj.vehicle_info?.plate_number || 'xe';
      const origin = req.headers['origin'] || req.headers['referer'];
      payUrl = vnpayService.createPaymentUrl({
        orderCode: pm.order_code,
        amount: pm.amount,
        orderInfo: `Dang ky ve thang ${rawPlate}`,
        ipAddr: ipAddrClean,
        origin
      });
    }

    return res.status(200).json({
      success: true,
      pending: {
        orderCode: pm.order_code,
        amount: pm.amount,
        status: pm.status === 'Đã thanh toán' ? 'paid' : 'pending',
        paymentMethod: methodLower,
        payUrl,
        registrationData: noteObj,
        paymentTime: pm.payment_time
      }
    });

  } catch (err) {
    console.error("Lỗi getPendingRegistration:", err);
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

/**
 * Tải hợp đồng PDF của thẻ tháng
 * GET /api/month-card/:id/contract
 */
export const getContractPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const details = await monthCardService.getCardDetailsForContract(id);

    // Tạo tài liệu PDF mới
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Thiết lập header
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Hop_Dong_Ve_Thang_${details.card_code}.pdf`);

    doc.pipe(res);

    // Đường dẫn font Arial hỗ trợ tiếng Việt trên Windows
    const fontPath = "C:\\Windows\\Fonts\\arial.ttf";
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      console.warn("Font Arial.ttf not found at C:\\Windows\\Fonts\\arial.ttf. Using Helvetica as fallback.");
    }

    // 1. Tiêu đề quốc hiệu
    doc.fontSize(11).text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { align: 'center', paragraphGap: 4 });
    doc.fontSize(12).bold().text("Độc lập - Tự do - Hạnh phúc", { align: 'center', paragraphGap: 15 });

    // Đường gạch ngang tiêu đề quốc hiệu
    const currentYAfterTitle = doc.y;
    doc.moveTo(220, currentYAfterTitle).lineTo(375, currentYAfterTitle).strokeColor('#000000').lineWidth(1).stroke();
    doc.moveDown(2);

    // 2. Tên hợp đồng
    doc.fontSize(15).bold().text("HỢP ĐỒNG ĐĂNG KÝ VÉ THÁNG GỬI XE", { align: 'center', paragraphGap: 5 });
    doc.fontSize(10).italic().text(`Số: HD-${details.card_code || 'xxxx'}/PBMS`, { align: 'center', paragraphGap: 20 });

    // 3. Nội dung văn bản
    doc.fontSize(10).text("Căn cứ các nội quy, quy định vận hành của hệ thống bãi xe và nhu cầu đăng ký gửi phương tiện của khách hàng, hôm nay hai bên thống nhất ký kết hợp đồng gửi xe tháng với các điều khoản dưới đây:", { align: 'justify', paragraphGap: 12 });

    // 4. Thông tin các bên
    doc.fontSize(11).bold().text("BÊN A: BAN QUẢN LÝ TÒA NHÀ & BÃI XE PBMS (BÊN CHO THUÊ)");
    doc.fontSize(10).text("- Người đại diện: Ban Quản lý Bãi xe PBMS", { indent: 15 });
    doc.fontSize(10).text("- Địa chỉ: Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội", { indent: 15 });
    doc.fontSize(10).text("- Số điện thoại liên hệ: 1900 1234", { indent: 15 });
    doc.moveDown(0.8);

    doc.fontSize(11).bold().text("BÊN B: KHÁCH HÀNG ĐĂNG KÝ THẺ THÁNG (BÊN GỬI XE)");
    doc.fontSize(10).text(`- Họ và tên khách hàng: ${details.customer?.full_name || '---'}`, { indent: 15 });
    doc.fontSize(10).text(`- Số điện thoại: ${details.customer?.phone || '---'}`, { indent: 15 });
    doc.fontSize(10).text(`- Địa chỉ email: ${details.customer?.email || '---'}`, { indent: 15 });
    doc.fontSize(10).text(`- Số CCCD/Định danh: ${details.customer?.cccd_number || '---'}`, { indent: 15 });
    doc.moveDown(0.8);

    // 5. Nội dung thỏa thuận chi tiết
    doc.fontSize(11).bold().text("THÔNG TIN VÉ THÁNG VÀ PHƯƠNG TIỆN ĐĂNG KÝ:");
    doc.moveDown(0.4);

    // Vẽ bảng thông tin
    let currentY = doc.y;
    const tableLeft = 50;
    const tableWidth = 495;
    const rowHeight = 22;

    // Vẽ nền cho Header bảng
    doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill('#f2f2f2');
    doc.fillColor('#000000');
    doc.fontSize(10).bold().text("Danh mục thông tin", tableLeft + 15, currentY + 6);
    doc.text("Nội dung chi tiết", tableLeft + 230, currentY + 6);

    currentY += rowHeight;
    doc.fontSize(10);

    const tableData = [
      ["Số thẻ RFID (Mã thẻ tháng)", details.card_code || '---'],
      ["Biển số xe đăng ký", details.vehicle?.plate_number || '---'],
      ["Loại phương tiện", details.vehicle?.type_name || '---'],
      ["Gói cước áp dụng", details.package?.name || '---'],
      ["Ngày bắt đầu hiệu lực", details.package?.start_date ? new Date(details.package.start_date).toLocaleDateString('vi-VN') : '---'],
      ["Ngày hết hạn hiệu lực", details.package?.end_date ? new Date(details.package.end_date).toLocaleDateString('vi-VN') : '---'],
      ["Đơn giá cước dịch vụ", `${(details.package?.price || 0).toLocaleString('vi-VN')} VNĐ`],
      ["Phương thức thanh toán", details.payment?.payment_method || 'Tiền mặt/Chuyển khoản'],
      ["Trạng thái thanh toán", details.payment?.status || 'Đã thanh toán']
    ];

    tableData.forEach((row) => {
      // Vẽ viền ngoài ô
      doc.rect(tableLeft, currentY, tableWidth, rowHeight).strokeColor('#cccccc').lineWidth(1).stroke();
      // Vẽ cột phân tách giữa
      doc.moveTo(tableLeft + 215, currentY).lineTo(tableLeft + 215, currentY + rowHeight).stroke();

      // Viết chữ
      doc.fillColor('#000000');
      doc.bold().text(row[0], tableLeft + 15, currentY + 6);
      doc.fontSize(10).text(row[1], tableLeft + 230, currentY + 6);

      currentY += rowHeight;
    });

    doc.y = currentY + 10;

    // 6. Điều khoản sử dụng
    doc.fontSize(11).bold().text("ĐIỀU KHOẢN VÀ TRÁCH NHIỆM:");
    doc.fontSize(9.5).text("1. Bên B có trách nhiệm tự bảo quản thẻ gửi xe RFID được cấp, không cho người khác mượn thẻ. Mất thẻ phải thông báo ngay cho Bên A để khóa thẻ kịp thời. Phí làm lại thẻ là 50.000 VNĐ.", { align: 'justify', indent: 10, paragraphGap: 4 });
    doc.fontSize(9.5).text("2. Bên B phải đỗ xe đúng vị trí phân làn quy định của từng loại xe, tuân thủ hướng dẫn điều phối của nhân viên bãi xe và tuân thủ các quy tắc an toàn phòng cháy chữa cháy.", { align: 'justify', indent: 10, paragraphGap: 4 });
    doc.fontSize(9.5).text("3. Bên A chịu trách nhiệm vận hành hệ thống kiểm soát xe vào/ra bằng thẻ và camera giám sát, không chịu trách nhiệm bảo quản tài sản riêng tư cá nhân để bên trong xe.", { align: 'justify', indent: 10, paragraphGap: 4 });
    doc.fontSize(9.5).text("4. Hợp đồng có giá trị hiệu lực trong khoảng thời gian hiệu lực ghi nhận phía trên. Bên B cần hoàn thành gia hạn tối thiểu 3 ngày trước khi hết hạn gửi xe để duy trì thẻ hoạt động.", { align: 'justify', indent: 10, paragraphGap: 15 });

    // 7. Ký tên
    const signYPosition = doc.y;
    doc.fontSize(10).bold().text("ĐẠI DIỆN BÊN A (BÊN CHO THUÊ)", 50, signYPosition, { width: 220, align: 'center' });
    doc.fontSize(9).italic().text("(Ký, ghi rõ họ tên và đóng dấu)", 50, signYPosition + 14, { width: 220, align: 'center' });

    doc.fontSize(10).bold().text("ĐẠI DIỆN BÊN B (KHÁCH HÀNG)", 320, signYPosition, { width: 220, align: 'center' });
    doc.fontSize(9).italic().text("(Ký và ghi rõ họ tên)", 320, signYPosition + 14, { width: 220, align: 'center' });

    // Ghi tên ký
    doc.fontSize(11).bold().text("Ban Quản Lý Bãi Xe PBMS", 50, signYPosition + 60, { width: 220, align: 'center' });
    doc.fontSize(11).bold().text(details.customer?.full_name || '---', 320, signYPosition + 60, { width: 220, align: 'center' });

    doc.end();
  } catch (err) {
    console.error("Lỗi tạo PDF hợp đồng:", err);
    return res.status(500).json({ error: err.message || "Lỗi tạo PDF hợp đồng từ server" });
  }
};

// ─────────────────────────────────────────────────────────────
// RENEWAL CONTROLLERS (Gia hạn vé tháng qua VNPay / tiền mặt)
// ─────────────────────────────────────────────────────────────

/**
 * Lấy thông tin gia hạn: trạng thái thẻ, thời hạn hiện tại, danh sách gói khả dụng.
 * GET /api/month-card/:cardId/renewal-info
 */
export const getRenewalInfo = async (req, res) => {
  try {
    const { cardId } = req.params;
    if (!cardId) return res.status(400).json({ error: 'Thiếu cardId.' });

    // Lấy userId từ token JWT
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }
    if (!userId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      userId = profiles?.[0]?.id || null;
    }

    const info = await renewalService.getRenewalInfo(cardId, userId);
    return res.status(200).json({ success: true, data: info });
  } catch (err) {
    console.error('getRenewalInfo error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};


/**
 * Khởi tạo giao dịch gia hạn: tạo payment record + VNPay URL (hoặc cash orderCode).
 * POST /api/month-card/initiate-renewal
 * Body: { cardId, packageId, paymentMethod: 'vnpay'|'cash' }
 */
export const initiateRenewal = async (req, res) => {
  try {
    const { cardId, packageId, paymentMethod } = req.body;
    if (!cardId) return res.status(400).json({ error: 'Thiếu cardId.' });
    if (!packageId) return res.status(400).json({ error: 'Thiếu packageId.' });
    if (!paymentMethod || !['vnpay', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({ error: "Phương thức thanh toán không hợp lệ ('vnpay' hoặc 'cash')." });
    }

    // Lấy IP của client
    const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ipAddrClean = (ipAddr === '::1' || ipAddr.includes('::ffff:')) ? '127.0.0.1' : ipAddr;

    // Lấy userId từ token JWT
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
        userId = user?.id || null;
      } catch { /* bỏ qua lỗi auth */ }
    }
    if (!userId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      userId = profiles?.[0]?.id || null;
    }

    const result = await renewalService.initiateRenewal({
      cardId,
      packageId,
      paymentMethod,
      ipAddr: ipAddrClean,
      userId,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('initiateRenewal error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * Xác nhận thu tiền mặt gia hạn (dành cho cashier).
 * POST /api/month-card/confirm-renewal-cash/:orderCode
 */
export const confirmRenewalCash = async (req, res) => {
  try {
    const { orderCode } = req.params;
    if (!orderCode) return res.status(400).json({ error: 'Thiếu orderCode.' });
    const result = await renewalService.confirmRenewalCash(orderCode);
    return res.status(200).json({ success: true, message: 'Gia hạn vé tháng thành công!', data: result });
  } catch (err) {
    console.error('confirmRenewalCash error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * Kiểm tra trạng thái giao dịch gia hạn theo orderCode.
 * GET /api/month-card/renewal-status/:orderCode
 */
export const getRenewalStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    return res.status(200).json({
      success: true,
      data: {
        orderCode: payment.order_code,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paid_at,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};