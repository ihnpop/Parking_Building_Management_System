import * as cardRepository from "../repositories/cardRepository.js";
import * as lostCardRepository from "../repositories/lostCardRepository.js";
import * as vnpayService from "./vnpayService.js";
import supabase from "../config/supabaseClient.js";
import { calculateParkingFee, parseEntryTime } from "./gateService.js";

export const getLostCards = async () => {
  // 1. Thực hiện truy vấn kết nối tầng từ bảng card_lost_log thông qua Repository
  const data = await lostCardRepository.getLostCardLogs();

  // 2. Chuẩn hóa và làm phẳng cấu trúc dữ liệu JSON trả về
  return Promise.all(
    data.map(async (log, idx) => {
      const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;

      // Mã thẻ hiện tại từ join với bảng card
      const currentCardCode = log.card?.code || "Không rõ";

      // Lấy snapshot mã thẻ tại thời điểm báo mất từ audit log 'Thẻ đã khóa'
      let cardCode = currentCardCode;
      if (log.card_id && log.lost_report_id) {
        const snapshot = await lostCardRepository.getCodeSnapshotByReportId(
          log.card_id,
          log.lost_report_id
        );
        if (snapshot) {
          cardCode = snapshot;
        }
      }

      const plateNumber = log.vehicle?.plate_number || "Chưa có xe";
      const customerName = log.vehicle?.customer?.full_name || "Khách vãng lai";

      // Nếu card là null (không có đăng ký thẻ) -> thẻ lượt, ngược lại lấy type từ card
      const cardType = log.card?.type || "Thẻ lượt";

      const handlerName = log.profiles?.full_name || "---";
      const description = log.description || "";

      // PHÂN LOẠI TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
      const statusVal = log.status || '';
      let statusText;
      if (statusVal === 'Đã xử lý xong' || statusVal === 'Đã xong' || statusVal === 'Đã tìm lại') {
        statusText = 'Đã xong';
      } else if (statusVal === 'Đã hủy thẻ') {
        statusText = 'Đã hủy thẻ';
      } else if (statusVal === 'Đã hủy (tạo nhầm)') {
        statusText = 'Đã hủy (tạo nhầm)';
      } else if (statusVal === 'Đang xử lý') {
        statusText = 'Đang xử lý';
      } else {
        statusText = 'Đang chờ';
      }

      // Kiểm tra giao dịch đang chờ thanh toán (timeout 15 phút)
      let pendingPayment = null;
      let pendingNoteObj = {}; // Lưu note obj để trích xuất parking_fee
      if (statusVal === 'Đã hủy thẻ') {
        const timeoutThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const paymentTypeToCheck = cardType === 'Thẻ tháng' ? 'Phí cấp lại thẻ' : 'Phí mất thẻ lượt';

        const { data: pm } = await supabase
          .from('payment')
          .select('*')
          .eq('payment_type', paymentTypeToCheck)
          .eq('status', 'Chờ thanh toán')
          .gt('payment_time', timeoutThreshold)
          .ilike('note', `%${log.lost_report_id}%`)
          .order('payment_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pm) {
          try {
            pendingNoteObj = JSON.parse(pm.note) || {};
          } catch (e) {
            console.error("Lỗi parse note:", e);
          }

          let payUrl = null;
          if (pm.payment_method === 'VNPay') {
            const orderInfoStr = cardType === 'Thẻ tháng'
              ? `Phi cap lai the - Report ${log.lost_report_id.substring(0, 8).toUpperCase()}`
              : `Phi mat the luot - Report ${log.lost_report_id.substring(0, 8).toUpperCase()}`;

            payUrl = vnpayService.createPaymentUrl({
              orderCode: pm.order_code,
              amount: pm.amount,
              orderInfo: orderInfoStr,
              ipAddr: '127.0.0.1',
            });
          }

          pendingPayment = {
            orderCode: pm.order_code,
            amount: pm.amount,
            paymentMethod: pm.payment_method === 'Tiền mặt' ? 'cash' : 'vnpay',
            payUrl,
            newCode: pendingNoteObj.newCode || '',
            paymentTime: pm.payment_time,
            // Trích xuất parking_fee từ note để hiển thị đúng khi resume
            parkingFee: pendingNoteObj.parkingFee ?? 0
          };
        }
      }

      // ── Tính parking_fee để trả về cho frontend resume đúng ──
      // Ưu tiên: (1) từ note của payment nếu đã khởi tạo, (2) tính lại từ phiên gửi xe
      let parking_fee = pendingPayment?.parkingFee ?? 0;

      if (!parking_fee && cardType !== 'Thẻ tháng' && log.vehicle_id &&
          ['Đang xử lý', 'Đã hủy thẻ'].includes(statusVal)) {
        try {
          let session = await lostCardRepository.findActiveParkingSession(log.vehicle_id);
          if (!session) {
            // Fallback: lấy phiên gần nhất
            const { data: latestSess } = await supabase
              .from('parking_sessions')
              .select('entry_time')
              .eq('vehicle_id', log.vehicle_id)
              .order('entry_time', { ascending: false })
              .limit(1)
              .maybeSingle();
            session = latestSess;
          }
          if (session?.entry_time) {
            const entryTime = parseEntryTime(session.entry_time);
            const feeResult = await calculateParkingFee(entryTime, new Date(), null);
            parking_fee = feeResult.fee || 0;
          }
        } catch (feeErr) {
          console.error('[getLostCards] Lỗi tính parking_fee khi resume:', feeErr.message);
        }
      }

      return {
        id: reportId,
        cardNo: cardCode,
        plate: plateNumber,
        card_type: cardType,
        owner: customerName,
        date: log.reported_at,
        handler: handlerName,
        reason: description,

        lost_report_id: log.lost_report_id, // UUID gốc đầy đủ
        raw_report_id: log.lost_report_id,  // UUID gốc đầy đủ
        display_report_id: reportId,        // dạng rút gọn (8 ký tự) để hiển thị
        card_id: log.card_id,              // card_id gốc
        card_code: cardCode,               // snapshot mã thẻ tại lúc báo mất
        plate_number: plateNumber,
        customer_name: customerName,
        reported_at: log.reported_at,
        handler_name: handlerName,
        description,
        vehicle_registration_image_url: log.vehicle_registration_image_url || null,
        id_card_image_url: log.id_card_image_url || null,

        // Phí gửi xe — để frontend hiển thị đúng khi resume report từ danh sách
        parking_fee,

        status: statusText,
        pendingPayment
      };
    })
  );
};

export const getLostCardLogs = getLostCards;

/**
 * Tạo báo cáo mất thẻ mới (rẽ nhánh Thẻ lượt và Thẻ tháng).
 */
export const createLostCard = async ({
  plate_number,
  description,
  performedBy,
  vehicle_registration_image_url,
  id_card_image_url
}) => {
  if (!plate_number) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  if (!description || !description.trim()) {
    throw new Error("Vui lòng nhập lí do báo mất.");
  }

  if (!performedBy) {
    throw new Error("Thiếu thông tin người thực hiện (performedBy) để ghi nhận audit log.");
  }

  // 1. Tra cứu vehicle_id từ biển số xe
  const vehicle = await cardRepository.findVehicleByPlate(plate_number);
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe có biển số ${plate_number}`);
  }

  // 2. Tìm thẻ đang gắn với xe
  let finalCardId = null;

  const activeReg = await lostCardRepository.findActiveCardByVehicle(vehicle.vehicle_id);
  if (activeReg) {
    finalCardId = activeReg.card_id;
  } else {
    const anyReg = await lostCardRepository.findAnyRegistrationByVehicle(vehicle.vehicle_id);
    if (anyReg) {
      finalCardId = anyReg.card_id;
    }
  }

  if (!finalCardId) {
    const order = await lostCardRepository.findCardByParkingOrder(vehicle.vehicle_id);
    if (order) {
      finalCardId = order.card_id;
    }
  }

  if (!finalCardId) {
    throw new Error(`Xe biển số ${plate_number} chưa được gắn thẻ nào trong hệ thống. Vui lòng đăng ký thẻ trước.`);
  }

  // Chặn báo mất trùng lặp: Nếu có bất kỳ báo cáo mất nào chưa ở trạng thái 'Đã xong' -> KHÔNG cho tạo mới
  const unfinishedReport = await lostCardRepository.findUnfinishedLostReportByVehicle(vehicle.vehicle_id);
  if (unfinishedReport) {
    throw new Error(
      `Xe biển số ${plate_number} đã có 1 báo cáo mất thẻ chưa ở trạng thái 'Đã xong' ` +
      `(mã: ${unfinishedReport.lost_report_id.substring(0, 8).toUpperCase()}, trạng thái hiện tại: '${unfinishedReport.status}'). ` +
      `Chỉ khi báo cáo cũ chuyển sang trạng thái 'Đã xong' mới có thể tạo lại báo cáo mất cho biển số này.`
    );
  }

  // Lấy thông tin thẻ
  const cardObj = await cardRepository.findCardTypeAndStatus(finalCardId);

  if (!cardObj) {
    throw new Error(`Không tìm thấy thông tin thẻ liên kết với xe biển số ${plate_number}.`);
  }

  // Bắt buộc thẻ phải đang ở trạng thái 'Hoạt động' mới được báo mất
  if (cardObj.status !== 'Hoạt động') {
    if (cardObj.status === 'Đã khóa') {
      throw new Error("Thẻ này đã bị khóa (có thể do đã có báo cáo mất thẻ trước đó). Không thể tạo báo cáo mới.");
    }
    if (cardObj.status === 'Đã xóa') {
      throw new Error("Thẻ này đã bị xóa khỏi hệ thống, không thể báo mất.");
    }
    throw new Error(`Thẻ (${cardObj.code || 'không rõ'}) liên kết với xe ${plate_number} hiện ở trạng thái '${cardObj.status}', chưa ở trạng thái 'Hoạt động'. Không thể tạo báo cáo mất thẻ.`);
  }

  const isDailyCard = !cardObj || cardObj.type !== 'Thẻ tháng';

  // Kiểm tra điều kiện riêng theo từng loại thẻ
  if (isDailyCard) {
    // Bắt buộc xe đang có phiên gửi xe active trong bãi đối với Thẻ lượt
    const activeSession = await lostCardRepository.findActiveParkingSession(vehicle.vehicle_id);
    if (!activeSession) {
      throw new Error("Xe không có phiên gửi xe đang hoạt động trong bãi, không thể báo mất thẻ lượt.");
    }

    // Gỡ customer_id khỏi vehicle
    await cardRepository.updateVehicleCustomer(vehicle.vehicle_id, null);
  }

  // 3. Thêm mới bản ghi vào bảng nhật ký mất thẻ card_lost_log
  const data = await lostCardRepository.insertLostCardLog({
    card_id: finalCardId,
    vehicle_id: vehicle.vehicle_id,
    description: description || "Khởi tạo báo mất thẻ",
    vehicle_registration_image_url: isDailyCard ? (vehicle_registration_image_url || null) : null,
    id_card_image_url: !isDailyCard ? (id_card_image_url || null) : null,
    reported_at: new Date().toISOString(),
    status: 'Đang chờ',
    handled_by: null
  });

  // 4. Khóa thẻ ngay lập tức
  try {
    await cardRepository.lockCard(finalCardId);
  } catch (lockErr) {
    console.error("Lỗi khi khóa thẻ sau khi ghi nhận báo mất:", lockErr.message);
    throw new Error(
      `Đã ghi nhận báo mất thẻ nhưng KHÔNG khóa được thẻ (lỗi: ${lockErr.message}). ` +
      `Vui lòng khóa thẻ thủ công ngay để đảm bảo an toàn.`
    );
  }

  // 5. Ghi audit trail
  const regForAudit = await lostCardRepository.findRegForAudit(finalCardId, vehicle.vehicle_id);

  await lostCardRepository.insertActivityLog({
    card_id: finalCardId,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'Thẻ đã khóa',
    plate_number,
    old_data: { status: cardObj?.status ?? null, code: cardObj?.code ?? null },
    new_data: { status: 'Đã khóa' },
    note: `Khóa thẻ tự động do báo mất - report ${data.lost_report_id}. Lý do: ${description || "Báo mất thẻ"}`,
    performed_by: performedBy
  });

  return data;
};

/**
 * Kiểm tra thông tin biển số xe và thẻ hoạt động trước khi tạo báo mất (tra cứu DB thực tế)
 */
export const checkLostCardPlate = async ({ plate_number, card_category }) => {
  if (!plate_number || !plate_number.trim()) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  const cleanPlate = plate_number.trim().toUpperCase();

  // 1. Tìm xe theo biển số
  const vehicle = await cardRepository.findVehicleByPlate(cleanPlate);
  if (!vehicle) {
    throw new Error(`Không tìm thấy phương tiện có biển số ${cleanPlate} trong hệ thống.`);
  }

  // 1.5. Kiểm tra xem biển số này có báo cáo mất nào chưa ở trạng thái 'Đã xong' hay không
  const unfinishedReport = await lostCardRepository.findUnfinishedLostReportByVehicle(vehicle.vehicle_id);
  if (unfinishedReport) {
    throw new Error(
      `Xe biển số ${cleanPlate} đã có 1 báo cáo mất thẻ chưa ở trạng thái 'Đã xong' ` +
      `(mã: ${unfinishedReport.lost_report_id.substring(0, 8).toUpperCase()}, trạng thái hiện tại: '${unfinishedReport.status}'). ` +
      `Chỉ khi báo cáo mất cũ chuyển sang trạng thái 'Đã xong' mới có thể tạo báo cáo mới cho biển số này.`
    );
  }

  // 2. Tìm thẻ đang gắn với xe (ưu tiên thẻ Hoạt động)
  const activeReg = await lostCardRepository.findActiveCardByVehicle(vehicle.vehicle_id);
  let finalCardId = activeReg?.card_id || null;

  if (!finalCardId) {
    const anyReg = await lostCardRepository.findAnyRegistrationByVehicle(vehicle.vehicle_id);
    if (anyReg) finalCardId = anyReg.card_id;
  }

  if (!finalCardId) {
    const order = await lostCardRepository.findCardByParkingOrder(vehicle.vehicle_id);
    if (order) finalCardId = order.card_id;
  }

  if (!finalCardId) {
    throw new Error(`Xe biển số ${cleanPlate} chưa được gắn thẻ nào trong hệ thống. Vui lòng đăng ký thẻ trước.`);
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(finalCardId);
  if (!cardObj) {
    throw new Error(`Không tìm thấy thông tin thẻ liên kết với xe biển số ${cleanPlate}.`);
  }

  if (cardObj.status !== 'Hoạt động') {
    throw new Error(`Xe biển số ${cleanPlate} không có thẻ nào đang ở trạng thái 'Hoạt động' (thẻ hiện ở trạng thái '${cardObj.status}'). Không thể báo mất.`);
  }

  const isDailyCard = cardObj.type !== 'Thẻ tháng';

  // 3. Kiểm tra điều kiện riêng theo loại thẻ
  let activeSession = null;
  if (isDailyCard) {
    activeSession = await lostCardRepository.findActiveParkingSession(vehicle.vehicle_id);
    if (!activeSession) {
      throw new Error(`Xe biển số ${cleanPlate} không có phiên gửi xe đang hoạt động trong bãi, không thể báo mất thẻ lượt.`);
    }
  }

  // 4. Lấy thông tin khách hàng nếu có
  const fullVehicle = await cardRepository.findVehicleById(vehicle.vehicle_id);
  const { data: vWithCust } = await supabase
    .from('vehicle')
    .select('*, customer(full_name)')
    .eq('vehicle_id', vehicle.vehicle_id)
    .maybeSingle();

  let parkingFee = 0;
  if (activeSession) {
    const entryTime = parseEntryTime(activeSession.entry_time);
    // Dùng vWithCust thay vì fullVehicle: vWithCust có vehicle_type_id để tra bảng giá DB
    const feeRes = await calculateParkingFee(entryTime, new Date(), vWithCust);
    parkingFee = feeRes.fee || 0;
  }

  const lostFee = 50000;
  const totalFee = isDailyCard ? parkingFee + lostFee : lostFee;

  return {
    exists: true,
    active: true,
    cardId: finalCardId,
    cardType: cardObj.type,
    cardCode: cardObj.code,
    ownerName: vWithCust?.customer?.full_name || (isDailyCard ? 'Khách gửi xe lượt' : 'Chủ thẻ tháng'),
    package: isDailyCard ? 'Vé gửi theo lượt/ca' : 'Gói vé tháng',
    inPark: !!activeSession,
    entryTime: activeSession ? activeSession.entry_time : null,
    parkingFee,
    lostFee,
    totalFee,
    feeDisplay: isDailyCard ? `${parkingFee.toLocaleString('vi-VN')} đ` : '0 đ (Vé tháng)'
  };
};

/**
 * Tiếp nhận xử lý một báo cáo mất thẻ.
 */
export const acceptLostCardReport = async ({ reportId, performedBy }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  const report = await lostCardRepository.findLostReportStatus(reportId);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  const PENDING_STATUSES = ['Đang chờ', 'Chờ xử lý'];
  if (!PENDING_STATUSES.includes(report.status)) {
    throw new Error(`Chỉ có thể tiếp nhận report ở trạng thái 'Đang chờ' (hiện tại: '${report.status}').`);
  }

  return await lostCardRepository.updateLostReport(reportId, { status: 'Đang xử lý', handled_by: performedBy });
};

/**
 * Hủy report mất thẻ do nhân viên tạo nhầm (chỉ khi 'Đang chờ').
 * Mở khóa lại thẻ ngay.
 */
export const cancelLostCardReport = async ({ reportId, performedBy, note }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  if (report.status !== 'Đang chờ') {
    throw new Error(
      `Chỉ có thể hủy report khi còn ở trạng thái 'Đang chờ' (chưa ai tiếp nhận). ` +
      `Trạng thái hiện tại: '${report.status}'.`
    );
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(report.card_id);
  const regForAudit = await lostCardRepository.findRegForAudit(report.card_id, report.vehicle_id);

  let plateForAudit = null;
  if (report.vehicle_id) {
    const vehicleForAudit = await cardRepository.findVehicleById(report.vehicle_id);
    plateForAudit = vehicleForAudit?.plate_number ?? null;
  }

  await cardRepository.unlockCard(report.card_id);

  await lostCardRepository.insertActivityLog({
    card_id: report.card_id,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'Thẻ đã mở khóa',
    plate_number: plateForAudit,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Hoạt động' },
    note: note || `Hủy report ${reportId} do tạo nhầm - mở khóa lại thẻ`,
    performed_by: performedBy
  });

  return await lostCardRepository.updateLostReport(reportId, { status: 'Đã hủy (tạo nhầm)' });
};

/**
 * Cập nhật thông tin báo cáo mất thẻ (lý do, ảnh cà vẹt, ảnh CCCD) từ bước 2
 */
export const updateLostCardReport = async (reportId, { description, vehicle_registration_image_url, id_card_image_url }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  return await lostCardRepository.updateLostReport(reportId, {
    description: description?.trim() || undefined,
    vehicle_registration_image_url: vehicle_registration_image_url || undefined,
    id_card_image_url: id_card_image_url || undefined
  });
};

/**
 * Đóng báo cáo mất thẻ (chỉ còn duy nhất hành động hủy thẻ vĩnh viễn).
 * Đổi trạng thái sang 'Đã hủy thẻ'.
 */
export const resolveLostCardReport = async ({ reportId, performedBy, note }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  const ALLOWED_STATUSES = ['Đang chờ', 'Chờ xử lý', 'Đang xử lý'];
  if (!ALLOWED_STATUSES.includes(report.status)) {
    throw new Error(
      `Chỉ có thể đóng report ở trạng thái 'Đang chờ' hoặc 'Đang xử lý'. ` +
      `Trạng thái hiện tại: '${report.status}'.`
    );
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(report.card_id);
  const regForAudit = await lostCardRepository.findRegForAudit(report.card_id, report.vehicle_id);

  let plateForAudit = null;
  if (report.vehicle_id) {
    const vehicleForAudit = await cardRepository.findVehicleById(report.vehicle_id);
    plateForAudit = vehicleForAudit?.plate_number ?? null;
  }

  // Hủy thẻ vĩnh viễn
  await cardRepository.cancelCard(report.card_id, performedBy);

  await lostCardRepository.insertActivityLog({
    card_id: report.card_id,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'Thẻ đã xóa',
    plate_number: plateForAudit,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã xóa' },
    note: note || `Hủy thẻ vĩnh viễn do mất thẻ - đóng report ${reportId}`,
    performed_by: performedBy
  });

  return await lostCardRepository.updateLostReport(reportId, {
    status: 'Đã hủy thẻ',
    handled_by: report.handled_by || performedBy
  });
};

/**
 * Cấp lại thẻ RFID cho thẻ tháng bị mất (update-in-place).
 */
export const reissueCard = async ({ cardId, newCode, reportId, performedBy, ipAddr, paymentMethod = 'vnpay' }) => {
  if (!cardId) throw new Error("Thiếu card_id.");
  if (!newCode?.trim()) throw new Error("Thiếu mã RFID mới (newCode).");
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ (reportId).");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  // Không cho phép ghi nợ nữa
  if (paymentMethod === 'defer') {
    throw new Error("Phương thức thanh toán 'Thanh toán sau' không còn được hỗ trợ. Vui lòng chọn Tiền mặt hoặc VNPay.");
  }

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) {
    throw new Error(`Không tìm thấy báo cáo mất thẻ với ID: ${reportId}.`);
  }
  if (report.status !== 'Đã hủy thẻ') {
    throw new Error(
      `Chỉ có thể cấp lại thẻ khi báo cáo ở trạng thái 'Đã hủy thẻ'. ` +
      `Trạng thái hiện tại: '${report.status}'.`
    );
  }
  if (report.card_id !== cardId) {
    throw new Error(
      `card_id không khớp với báo cáo mất thẻ (report.card_id=${report.card_id}).`
    );
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(cardId);
  if (!cardObj) {
    throw new Error(`Không tìm thấy thẻ với ID: ${cardId}.`);
  }
  if (cardObj.type !== 'Thẻ tháng') {
    throw new Error(
      `Chỉ áp dụng cấp lại cho thẻ tháng. Loại thẻ hiện tại: '${cardObj.type}'.`
    );
  }

  const codeExists = await cardRepository.checkCodeExists(newCode.trim());
  if (codeExists) {
    throw new Error(
      `Mã RFID '${newCode.trim()}' đã tồn tại trong hệ thống. Vui lòng dùng mã khác.`
    );
  }

  const REISSUE_FEE = 50000;
  const orderCode = `RI${Date.now()}`;

  const savedPayload = {
    cardId,
    newCode: newCode.trim(),
    reportId,
    paymentMethod,
    performedBy
  };

  const { data: paymentData, error: paymentErr } = await supabase
    .from('payment')
    .insert({
      amount: REISSUE_FEE,
      payment_type: 'Phí cấp lại thẻ',
      status: 'Chờ thanh toán',
      order_code: orderCode,
      payment_method: paymentMethod === 'cash' ? 'Tiền mặt' : 'VNPay',
      note: JSON.stringify(savedPayload),
      payment_time: new Date().toISOString(),
      created_by: performedBy
    })
    .select('payment_id')
    .single();

  if (paymentErr) {
    throw new Error(`Không thể tạo phiếu thu phí cấp lại thẻ: ${paymentErr.message}`);
  }

  let payUrl = null;
  if (paymentMethod === 'vnpay') {
    try {
      const clientIp = (ipAddr && ipAddr !== '::1' && !ipAddr.includes('::ffff:'))
        ? ipAddr
        : '127.0.0.1';
      payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount: REISSUE_FEE,
        orderInfo: `Phi cap lai the thang - Report ${reportId.substring(0, 8).toUpperCase()}`,
        ipAddr: clientIp
      });
    } catch (vnpayErr) {
      console.error('[reissueCard] Lỗi sinh URL VNPay:', vnpayErr.message);
    }
  }

  return {
    payment_id: paymentData.payment_id,
    order_code: orderCode,
    reissue_fee: REISSUE_FEE,
    payUrl,
    paymentMethod
  };
};

/**
 * Xử lý cấp lại thẻ tháng thành công sau khi xác nhận thanh toán
 */
export const processReissueSuccess = async (orderCode) => {
  const { data: payment, error: paymentErr } = await supabase
    .from('payment')
    .select('*')
    .eq('order_code', orderCode)
    .single();

  if (paymentErr || !payment) throw new Error("Không tìm thấy giao dịch: " + orderCode);
  if (payment.status !== 'Đã thanh toán') throw new Error("Giao dịch chưa được xác nhận thanh toán.");

  let payload;
  try {
    payload = JSON.parse(payment.note);
  } catch {
    throw new Error("Dữ liệu note của giao dịch cấp lại không hợp lệ.");
  }

  const { cardId, newCode, reportId, performedBy } = payload;

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  const cardObj = await cardRepository.findCardTypeAndStatus(cardId);
  if (!cardObj) throw new Error("Không tìm thấy thẻ.");

  const oldCode = cardObj.code;

  const updatedCard = await cardRepository.reissueCardUpdate(cardId, newCode.trim());

  const regForAudit = await lostCardRepository.findRegForAudit(cardId, report.vehicle_id);
  let plateForAudit = null;
  let customerNameForAudit = null;
  if (report.vehicle_id) {
    const { data: vWithCust } = await supabase
      .from('vehicle')
      .select(`
        plate_number,
        customer ( full_name )
      `)
      .eq('vehicle_id', report.vehicle_id)
      .maybeSingle();

    if (vWithCust) {
      plateForAudit = vWithCust.plate_number;
      customerNameForAudit = vWithCust.customer?.full_name || null;
    }
  }

  await lostCardRepository.insertActivityLog({
    card_id: cardId,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'Thẻ đã cấp lại',
    plate_number: plateForAudit,
    customer_name: customerNameForAudit,
    amount: payment.amount,
    old_data: { code: oldCode },
    new_data: { code: newCode.trim(), status: 'Hoạt động' },
    note: `Cấp lại thẻ tháng - mã RFID cũ: ${oldCode} → mới: ${newCode.trim()} - Report ID: ${reportId}`,
    performed_by: performedBy
  });

  await lostCardRepository.updateLostReport(reportId, { status: 'Đã xong' });

  return { success: true, updatedCard };
};

/**
 * Cashier xác nhận thu tiền mặt cho giao dịch cấp lại thẻ tháng
 */
export const confirmReissueCash = async (orderCode) => {
  const { data: payment, error: paymentErr } = await supabase
    .from('payment')
    .select('*')
    .eq('order_code', orderCode)
    .single();

  if (paymentErr || !payment) throw new Error("Không tìm thấy giao dịch.");
  if (payment.payment_type !== 'Phí cấp lại thẻ') throw new Error("Giao dịch không phải phí cấp lại thẻ.");
  if (payment.status !== 'Chờ thanh toán') throw new Error("Giao dịch đã được xử lý trước đó.");

  const { error: updateErr } = await supabase
    .from('payment')
    .update({
      status: 'Đã thanh toán',
      paid_at: new Date().toISOString()
    })
    .eq('order_code', orderCode);

  if (updateErr) throw new Error("Không thể cập nhật trạng thái thanh toán.");

  return await processReissueSuccess(orderCode);
};

/**
 * Khởi tạo thanh toán mất thẻ lượt (Tính tổng tiền = Phí gửi xe + 50.000đ)
 */
export const initiateLostTurnCardPayment = async ({ reportId, paymentMethod = 'vnpay', ipAddr, performedBy }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ (reportId).");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) {
    throw new Error(`Không tìm thấy báo cáo mất thẻ với ID: ${reportId}.`);
  }
  const ALLOWED_PAYMENT_STATUSES = ['Đang chờ', 'Chờ xử lý', 'Đang xử lý', 'Đã hủy thẻ'];
  if (!ALLOWED_PAYMENT_STATUSES.includes(report.status)) {
    throw new Error(
      `Báo cáo mất thẻ phải ở trạng thái 'Đang chờ', 'Đang xử lý' hoặc 'Đã hủy thẻ' để thanh toán. ` +
      `Trạng thái hiện tại: '${report.status}'.`
    );
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(report.card_id);
  if (cardObj && cardObj.type === 'Thẻ tháng') {
    throw new Error("Giao dịch này là thẻ tháng, vui lòng dùng luồng Cấp lại thẻ tháng.");
  }

  // 1. Tìm phiên gửi xe đang gửi xe hoặc gần nhất của xe này
  let session = await lostCardRepository.findActiveParkingSession(report.vehicle_id);
  if (!session) {
    const { data: latestSession } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('vehicle_id', report.vehicle_id)
      .order('entry_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    session = latestSession;
  }

  if (!session) {
    throw new Error("Không tìm thấy phiên gửi xe liên quan đến phương tiện để tính phí.");
  }

  // 2. Tính phí gửi xe dựa trên entry_time và thời điểm hiện tại
  const vehicle = await cardRepository.findVehicleById(report.vehicle_id);
  const entryTime = parseEntryTime(session.entry_time);
  const feeResult = await calculateParkingFee(entryTime, new Date(), vehicle);

  const parkingFee = feeResult.fee || 0;
  const lostCardFee = 50000;
  const totalAmount = parkingFee + lostCardFee;

  const orderCode = `LTC${Date.now()}`;
  const savedPayload = {
    reportId,
    cardId: report.card_id,
    sessionId: session.session_id,
    parkingFee,
    lostCardFee,
    totalAmount,
    performedBy
  };

  const { data: paymentData, error: paymentErr } = await supabase
    .from('payment')
    .insert({
      amount: totalAmount,
      payment_type: 'Phí mất thẻ lượt',
      status: 'Chờ thanh toán',
      order_code: orderCode,
      payment_method: paymentMethod === 'cash' ? 'Tiền mặt' : 'VNPay',
      session_id: session.session_id,
      note: JSON.stringify(savedPayload),
      payment_time: new Date().toISOString(),
      created_by: performedBy
    })
    .select('payment_id')
    .single();

  if (paymentErr) {
    throw new Error(`Không thể tạo phiếu thu phí mất thẻ lượt: ${paymentErr.message}`);
  }

  let payUrl = null;
  if (paymentMethod === 'vnpay') {
    try {
      const clientIp = (ipAddr && ipAddr !== '::1' && !ipAddr.includes('::ffff:'))
        ? ipAddr
        : '127.0.0.1';
      payUrl = vnpayService.createPaymentUrl({
        orderCode,
        amount: totalAmount,
        orderInfo: `Phi mat the luot - Report ${reportId.substring(0, 8).toUpperCase()}`,
        ipAddr: clientIp
      });
    } catch (vnpayErr) {
      console.error('[initiateLostTurnCardPayment] Lỗi sinh URL VNPay:', vnpayErr.message);
    }
  }

  return {
    payment_id: paymentData.payment_id,
    order_code: orderCode,
    parking_fee: parkingFee,
    lost_fee: lostCardFee,
    total_fee: totalAmount,
    payUrl,
    paymentMethod
  };
};

/**
 * Xử lý thành công sau khi xác nhận thanh toán phí mất thẻ lượt
 */
export const processLostTurnCardPaymentSuccess = async (orderCode) => {
  const { data: payment, error: paymentErr } = await supabase
    .from('payment')
    .select('*')
    .eq('order_code', orderCode)
    .single();

  if (paymentErr || !payment) throw new Error("Không tìm thấy giao dịch: " + orderCode);
  if (payment.status !== 'Đã thanh toán') throw new Error("Giao dịch chưa được xác nhận thanh toán.");

  let payload;
  try {
    payload = JSON.parse(payment.note);
  } catch {
    throw new Error("Dữ liệu note của giao dịch mất thẻ lượt không hợp lệ.");
  }

  const { reportId, cardId, sessionId, parkingFee, totalAmount, performedBy } = payload;

  const report = await lostCardRepository.findLostReport(reportId);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  const cardObj = await cardRepository.findCardTypeAndStatus(cardId);
  if (cardObj && cardObj.status !== 'Đã xóa') {
    await cardRepository.cancelCard(cardId, performedBy);
  }

  // Đóng phiên gửi xe: exit_time = now(), status = 'Hoàn thành', final_fee = parkingFee
  if (sessionId) {
    await lostCardRepository.closeSessionForLostCard(sessionId, parkingFee);
  }

  // Ghi audit trail
  const regForAudit = await lostCardRepository.findRegForAudit(cardId, report.vehicle_id);
  let plateForAudit = null;
  if (report.vehicle_id) {
    const vehicleForAudit = await cardRepository.findVehicleById(report.vehicle_id);
    plateForAudit = vehicleForAudit?.plate_number ?? null;
  }

  await lostCardRepository.insertActivityLog({
    card_id: cardId,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'Thẻ đã xóa',
    plate_number: plateForAudit,
    amount: totalAmount,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã xóa' },
    note: `Thanh toán thành công phí mất thẻ lượt (${totalAmount}đ) - Đóng phiên gửi xe ${sessionId || ''} - Report ID: ${reportId}`,
    performed_by: performedBy
  });

  // Cập nhật trạng thái report → 'Đã xong'
  await lostCardRepository.updateLostReport(reportId, { status: 'Đã xong' });

  return { success: true };
};

/**
 * Cashier xác nhận thu tiền mặt cho phí mất thẻ lượt
 */
export const confirmLostTurnCardCash = async (orderCode) => {
  const { data: payment, error: paymentErr } = await supabase
    .from('payment')
    .select('*')
    .eq('order_code', orderCode)
    .single();

  if (paymentErr || !payment) throw new Error("Không tìm thấy giao dịch.");
  if (payment.payment_type !== 'Phí mất thẻ lượt') throw new Error("Giao dịch không phải phí mất thẻ lượt.");
  if (payment.status !== 'Chờ thanh toán') throw new Error("Giao dịch đã được xử lý trước đó.");

  const { error: updateErr } = await supabase
    .from('payment')
    .update({
      status: 'Đã thanh toán',
      paid_at: new Date().toISOString()
    })
    .eq('order_code', orderCode);

  if (updateErr) throw new Error("Không thể cập nhật trạng thái thanh toán.");

  return await processLostTurnCardPaymentSuccess(orderCode);
};

/**
 * Lấy toàn bộ lịch sử xử lý (audit trail) để hiển thị cho quản lý.
 */
export const getAllHistory = async () => {
  const logs = await lostCardRepository.getAllActivityLogs();

  return logs.map((log) => ({
    log_id: log.log_id,
    action: log.action,
    card_code: log.old_data?.code || log.card?.code || "---",
    plate_number: log.plate_number,
    old_data: log.old_data,
    new_data: log.new_data,
    note: log.note,
    performed_by_name: log.profiles?.full_name || "Hệ thống",
    performed_at: log.performed_at
  }));
};