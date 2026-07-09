import * as cardRepository from "../repositories/cardRepository.js";
import * as lostCardRepository from "../repositories/lostCardRepository.js";

export const getLostCards = async () => {
  // 1. Thực hiện truy vấn kết nối tầng từ bảng card_lost_log thông qua Repository
  const data = await lostCardRepository.getLostCardLogs();

  // 2. Chuẩn hóa và làm phẳng cấu trúc dữ liệu JSON trả về
  return data.map((log, idx) => {
    const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;
    const cardCode = log.card?.code || "Không rõ";
    const plateNumber = log.vehicle?.plate_number || "Chưa có xe";
    const customerName = log.vehicle?.customer?.full_name || "Khách vãng lai";

    // Nếu card là null (không có đăng ký thẻ) -> thẻ lượt, ngược lại lấy type từ card
    const cardType = log.card?.type || "Thẻ lượt";

    // Nếu rỗng (NULL - Chờ xử lý) thì hiển thị gạch ngang thanh lịch "---"
    const handlerName = log.profiles?.full_name || "---";

    // Nội dung / lí do báo mất (nhập từ form tạo báo mất mới)
    const description = log.description || "";

    // PHÂN LOẠI TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
    const statusVal = log.status || '';
    let statusText;
    if (statusVal === 'Đã xử lý xong' || statusVal === 'Đã xong' || statusVal === 'Đã tìm lại') {
      statusText = 'Đã xong';
    } else if (statusVal === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    } else if (statusVal === 'Đang xử lý') {
      statusText = 'Đang xử lý';
    } else {
      statusText = 'Đang chờ';
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

      lost_report_id: reportId,          // dạng rút gọn (8 ký tự) - CHỈ để hiển thị
      raw_report_id: log.lost_report_id, // UUID gốc đầy đủ - BẮT BUỘC dùng khi gọi API accept/resolve
      card_code: cardCode,
      plate_number: plateNumber,
      customer_name: customerName,
      reported_at: log.reported_at,
      handler_name: handlerName,
      description,

      status: statusText
    };
  });
};

export const getLostCardLogs = getLostCards;

/**
 * Tạo báo cáo mất thẻ mới.
 */
export const createLostCard = async ({
  plate_number,
  description,
  performedBy
}) => {
  if (!plate_number) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  if (!performedBy) {
    throw new Error("Thiếu thông tin người thực hiện (performedBy) để ghi nhận audit log.");
  }

  // 1. Tra cứu vehicle_id từ biển số xe
  const vehicle = await cardRepository.findVehicleByPlate(plate_number);
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe có biển số ${plate_number}`);
  }

  // 2. Tìm thẻ đang gắn với xe qua bảng card_registrations
  let finalCardId = null;

  // 2a. Tìm thẻ có trạng thái ACTIVE hoặc Hoạt động
  const activeReg = await lostCardRepository.findActiveCardByVehicle(vehicle.vehicle_id);

  if (activeReg) {
    finalCardId = activeReg.card_id;
  } else {
    // 2b. Không có thẻ ACTIVE -> tìm bất kỳ thẻ nào đã đăng ký với xe
    const anyReg = await lostCardRepository.findAnyRegistrationByVehicle(vehicle.vehicle_id);
    if (anyReg) {
      finalCardId = anyReg.card_id;
    }
  }

  // 2c. Nếu vẫn không tìm thấy thẻ -> tìm qua bảng parking_order
  if (!finalCardId) {
    const order = await lostCardRepository.findCardByParkingOrder(vehicle.vehicle_id);
    if (order) {
      finalCardId = order.card_id;
    }
  }

  if (!finalCardId) {
    throw new Error(`Xe biển số ${plate_number} chưa được gắn thẻ nào trong hệ thống. Vui lòng đăng ký thẻ trước.`);
  }

  // Chặn báo mất trùng lặp
  const CLOSED_LOST_STATUSES = ['Đã xong', 'Đã xử lý xong', 'Đã tìm lại', 'Đã hủy thẻ'];
  const openReports = await lostCardRepository.findOpenLostReports(finalCardId, CLOSED_LOST_STATUSES);

  if (openReports && openReports.length > 0) {
    throw new Error(
      `Thẻ này đã có báo cáo mất thẻ đang được xử lý (mã: ${openReports[0].lost_report_id}). ` +
      `Vui lòng xử lý xong báo cáo cũ trước khi tạo báo cáo mới.`
    );
  }

  // Lấy thông tin thẻ để kiểm tra loại thẻ và trạng thái hiện tại
  const cardObj = await cardRepository.findCardTypeAndStatus(finalCardId);

  if (cardObj?.status === 'Đã khóa') {
    throw new Error("Thẻ này đã bị khóa (có thể do đã có báo cáo mất thẻ trước đó). Không thể tạo báo cáo mới.");
  }
  if (cardObj?.status === 'Đã xóa') {
    throw new Error("Thẻ này đã bị xóa khỏi hệ thống, không thể báo mất.");
  }

  const isDailyCard = !cardObj || cardObj.type !== 'Thẻ tháng';

  if (isDailyCard) {
    await cardRepository.updateVehicleCustomer(vehicle.vehicle_id, null);
  }

  // 3. Thêm mới bản ghi vào bảng nhật ký mất thẻ card_lost_log
  const data = await lostCardRepository.insertLostCardLog({
    card_id: finalCardId,
    vehicle_id: vehicle.vehicle_id,
    description: description || "Báo mất thẻ",
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
    action: 'CARD_LOCKED',
    plate_number,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã khóa' },
    note: `Khóa thẻ tự động do báo mất - report ${data.lost_report_id}. Lý do: ${description || "Báo mất thẻ"}`,
    performed_by: performedBy
  });

  return data;
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
 * Đóng một báo cáo mất thẻ.
 */
export const resolveLostCardReport = async ({ reportId, performedBy, resolution, note }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");
  if (!['FOUND', 'CANCELLED'].includes(resolution)) {
    throw new Error("resolution phải là 'FOUND' (tìm lại thẻ) hoặc 'CANCELLED' (hủy thẻ).");
  }

  const report = await lostCardRepository.findLostReport(reportId);

  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  if (report.status !== 'Đang xử lý') {
    throw new Error(
      `Chỉ có thể đóng report đã được tiếp nhận (trạng thái 'Đang xử lý'). ` +
      `Trạng thái hiện tại: '${report.status}'. Vui lòng tiếp nhận xử lý trước.`
    );
  }

  const cardObj = await cardRepository.findCardTypeAndStatus(report.card_id);
  const regForAudit = await lostCardRepository.findRegForAudit(report.card_id, report.vehicle_id);

  let plateForAudit = null;
  if (report.vehicle_id) {
    const vehicleForAudit = await cardRepository.findVehicleById(report.vehicle_id);
    plateForAudit = vehicleForAudit?.plate_number ?? null;
  }

  if (resolution === 'FOUND') {
    await cardRepository.unlockCard(report.card_id);

    await lostCardRepository.insertActivityLog({
      card_id: report.card_id,
      registration_id: regForAudit?.registration_id ?? null,
      action: 'CARD_UNLOCKED',
      plate_number: plateForAudit,
      old_data: { status: cardObj?.status ?? null },
      new_data: { status: 'Hoạt động' },
      note: note || `Tìm lại được thẻ - đóng report ${reportId}`,
      performed_by: performedBy
    });

    return await lostCardRepository.updateLostReport(reportId, { status: 'Đã tìm lại' });
  }

  await cardRepository.cancelCard(report.card_id, performedBy);

  await lostCardRepository.insertActivityLog({
    card_id: report.card_id,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'CARD_DELETED',
    plate_number: plateForAudit,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã xóa' },
    note: note || `Hủy thẻ vĩnh viễn do mất thẻ - đóng report ${reportId}`,
    performed_by: performedBy
  });

  return await lostCardRepository.updateLostReport(reportId, { status: 'Đã hủy thẻ' });
};
