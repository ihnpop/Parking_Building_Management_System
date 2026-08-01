import * as monthCardService from "../service/monthCardService.js";
import { resolveBuildingIdFromReq } from "../middlewares/auth.js";
import { uploadImageToVNPT, checkDocumentLiveness, ocrIdentityCard } from "../service/ekycService.js";
import { getUserIdFromReq } from "../helpers/authHelper.js";
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
 * Lấy danh sách loại xe (vehicle_type)
 * GET /api/month-card/vehicle-types
 */
export const getVehicleTypes = async (req, res) => {
  try {
    const data = await monthCardService.getVehicleTypes();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy danh sách gói cước tháng (lọc theo building của user nếu có)
 * GET /api/month-card/packages
 */
export const getPackages = async (req, res) => {
  try {
    const userId = await getUserIdFromReq(req);
    const data = await monthCardService.getPackages(userId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



/**
 * Lấy danh sách gói gia hạn thẻ tháng
 * GET /api/month-card/renew-packages
 */
export const getRenewPackages = async (req, res) => {
  try {
    const userId = await getUserIdFromReq(req);
    const packages = await monthCardService.getRenewPackages(userId);
    return res.status(200).json(packages);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Thực hiện gia hạn thẻ tháng (legacy - staff thực hiện thủ công)
 * POST /api/month-card/renew
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

    let currentUserId = await getUserIdFromReq(req);
    if (!currentUserId) {
      currentUserId = '00000000-0000-0000-0000-000000000000';
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
 * POST /api/month-card/create
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

    let currentUserId = await getUserIdFromReq(req);
    if (!currentUserId) {
      currentUserId = '00000000-0000-0000-0000-000000000000';
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
 * PUT /api/month-card/:id
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
    return res.status(200).json({ message: 'Xóa thẻ tháng thành công', data: result });
  } catch (err) {
    console.error('deleteMonthCard error:', err);
    return res.status(err.statusCode || 500).json({ message: err.message || 'Lỗi server' });
  }
};

/**
 * Lấy danh sách thẻ tháng
 * GET /api/month-card
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
 * GET /api/month-card/logs
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
    doc.fontSize(15).bold().text("HỢP ĐỒNG ĐĂNG KÝ thẻ THÁNG GỬI XE", { align: 'center', paragraphGap: 5 });
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
    doc.fontSize(11).bold().text("THÔNG TIN thẻ THÁNG VÀ PHƯƠNG TIỆN ĐĂNG KÝ:");
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