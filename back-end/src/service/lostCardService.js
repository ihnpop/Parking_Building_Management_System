import * as cardRepository from "../repositories/cardRepository.js";
import * as lostCardRepository from "../repositories/lostCardRepository.js";
import * as vnpayService from "./vnpayService.js";
import supabase from "../config/supabaseClient.js";

export const getLostCards = async () => {
  // 1. Thực hiện truy vấn kết nối tầng từ bảng card_lost_log thông qua Repository
  const data = await lostCardRepository.getLostCardLogs();

  // 2. Chuẩn hóa và làm phẳng cấu trúc dữ liệu JSON trả về
  // Dùng Promise.all để lấy snapshot mã thẻ lúc báo mất song song
  return Promise.all(
    data.map(async (log, idx) => {
      const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;

      // Mã thẻ hiện tại từ join với bảng card
      const currentCardCode = log.card?.code || "Không rõ";

      // Quan trọng: với report đã hủy thẻ, card.code có thể đã bị ghi đè (nếu đã cấp lại).
      // Lấy snapshot mã thẻ tại thời điểm báo mất từ audit log 'Thẻ đã khóa'.
      // Nếu chưa cấp lại (code vẫn giữ nguyên hoặc chưa có snapshot), dùng currentCardCode.
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
      } else if (statusVal === 'Đã hủy (tạo nhầm)') {
        statusText = 'Đã hủy (tạo nhầm)';
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
        card_id: log.card_id,              // card_id gốc - dùng khi cấp lại thẻ
        card_code: cardCode,               // snapshot mã thẻ tại lúc báo mất
        plate_number: plateNumber,
        customer_name: customerName,
        reported_at: log.reported_at,
        handler_name: handlerName,
        description,

        status: statusText
      };
    })
  );
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
  const CLOSED_LOST_STATUSES = ['Đã xong', 'Đã xử lý xong', 'Đã tìm lại', 'Đã hủy thẻ', 'Đã hủy (tạo nhầm)'];
  const openReports = await lostCardRepository.findOpenLostReports(finalCardId, CLOSED_LOST_STATUSES);

  if (openReports && openReports.length > 0) {
    throw new Error(
      `Thẻ này đã có báo cáo mất thẻ đang được xử lý (mã: ${openReports[0].lost_report_id}). ` +
      `Vui lòng xử lý xong báo cáo cũ trước khi tạo báo cáo mới.`
    );
  }

  // Lấy thông tin thẻ để kiểm tra loại thẻ, trạng thái và mã thẻ hiện tại
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
  // Quan trọng: lưu cardObj.code vào old_data để sau này dùng làm snapshot
  // khi hiển thị nhật ký mất thẻ (tránh hiển thị mã mới sau khi cấp lại).
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
 * Hủy report mất thẻ do nhân viên tạo nhầm (KHÁC "Hủy thẻ" ở resolveLostCardReport
 * - resolve/Hủy thẻ nghĩa là thẻ bị hủy vĩnh viễn; hàm này nghĩa là report tự nó sai,
 * thẻ hoàn toàn không có vấn đề gì, cần mở khóa lại ngay).
 * Chỉ cho phép hủy khi report còn ở trạng thái 'Đang chờ' - tức chưa ai tiếp nhận.
 * Nếu đã 'Đang xử lý' trở đi, phải đi hết state machine qua resolveLostCardReport.
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

  // Mở khóa thẻ ngay - hoàn tác đúng bước khóa đã làm lúc tạo report (rule #1)
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
 * Đóng một báo cáo mất thẻ.
 */
export const resolveLostCardReport = async ({ reportId, performedBy, resolution, note }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");
  if (!['Tìm lại thẻ', 'Hủy thẻ'].includes(resolution)) {
    throw new Error("resolution phải là 'Tìm lại thẻ' hoặc 'Hủy thẻ'.");
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

  if (resolution === 'Tìm lại thẻ') {
    await cardRepository.unlockCard(report.card_id);

    await lostCardRepository.insertActivityLog({
      card_id: report.card_id,
      registration_id: regForAudit?.registration_id ?? null,
      action: 'Thẻ đã mở khóa',
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
    action: 'Thẻ đã xóa',
    plate_number: plateForAudit,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã xóa' },
    note: note || `Hủy thẻ vĩnh viễn do mất thẻ - đóng report ${reportId}`,
    performed_by: performedBy
  });

  return await lostCardRepository.updateLostReport(reportId, { status: 'Đã hủy thẻ' });
};

/**
 * Cấp lại thẻ RFID cho thẻ tháng bị mất (update-in-place).
 *
 * Thay vì tạo thẻ mới, hệ thống ghi đè mã RFID mới trực tiếp lên thẻ cũ.
 * - card.code  → mã RFID mới
 * - card.status → 'Hoạt động'
 * - card_registrations, hợp đồng giữ nguyên (card_id không đổi)
 *
 * @param {{ cardId, newCode, reportId, performedBy, ipAddr }} params
 */
export const reissueCard = async ({ cardId, newCode, reportId, performedBy, ipAddr }) => {
  if (!cardId) throw new Error("Thiếu card_id.");
  if (!newCode?.trim()) throw new Error("Thiếu mã RFID mới (newCode).");
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ (reportId).");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  // ── 1. Validate report ──────────────────────────────────────────────────────
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

  // ── 2. Validate loại thẻ phải là 'Thẻ tháng' ────────────────────────────────
  const cardObj = await cardRepository.findCardTypeAndStatus(cardId);
  if (!cardObj) {
    throw new Error(`Không tìm thấy thẻ với ID: ${cardId}.`);
  }
  if (cardObj.type !== 'Thẻ tháng') {
    throw new Error(
      `Chỉ áp dụng cấp lại cho thẻ tháng. Loại thẻ hiện tại: '${cardObj.type}'.`
    );
  }

  // ── 3. Validate mã RFID mới không trùng với thẻ khác ────────────────────────
  const codeExists = await cardRepository.checkCodeExists(newCode.trim());
  if (codeExists) {
    throw new Error(
      `Mã RFID '${newCode.trim()}' đã tồn tại trong hệ thống. Vui lòng dùng mã khác.`
    );
  }

  const oldCode = cardObj.code; // lưu mã cũ để ghi vào audit log

  // ── 4. Update-in-place: ghi đè mã RFID và khôi phục trạng thái ──────────────
  const updatedCard = await cardRepository.reissueCardUpdate(cardId, newCode.trim());

  // ── 5. Tạo phiếu thu phí cấp lại thẻ 50.000đ ────────────────────────────────
  const REISSUE_FEE = 50000;
  const orderCode = `RI${Date.now()}`;

  const { data: paymentData, error: paymentErr } = await supabase
    .from('payment')
    .insert({
      amount: REISSUE_FEE,
      payment_type: 'Phí cấp lại thẻ',
      status: 'Chờ thanh toán',
      order_code: orderCode,
      note: `Phí cấp lại thẻ tháng do mất - Report ID: ${reportId}`,
      payment_time: new Date().toISOString()
    })
    .select('payment_id')
    .single();

  if (paymentErr) {
    throw new Error(`Không thể tạo phiếu thu phí cấp lại thẻ: ${paymentErr.message}`);
  }

  // ── 6. Sinh link thanh toán VNPay ────────────────────────────────────────────
  let payUrl = null;
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
    // Không rollback — thẻ đã cấp lại thành công, chỉ thiếu payUrl
  }

  // ── 7. Ghi audit log ─────────────────────────────────────────────────────────
  const regForAudit = await lostCardRepository.findRegForAudit(cardId, report.vehicle_id);
  let plateForAudit = null;
  let customerNameForAudit = null;
  if (report.vehicle_id) {
    const { data: vWithCust } = await supabase
      .from('vehicle')
      .select(`
        plate_number,
        customer (
          full_name
        )
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
    amount: REISSUE_FEE,
    old_data: { code: oldCode },
    new_data: { code: newCode.trim(), status: 'Hoạt động' },
    note: `Cấp lại thẻ tháng - mã RFID cũ: ${oldCode} → mới: ${newCode.trim()} - Report ID: ${reportId}`,
    performed_by: performedBy
  });

  // ── 8. Cập nhật trạng thái report → 'Đã xong' ──────────────────────────────
  // Thẻ đã được cấp lại thành công (update-in-place hoàn tất).
  // Việc thanh toán 50k là phí bổ sung; dù thanh toán sau thì report cũng đã giải quyết xong.
  await lostCardRepository.updateLostReport(reportId, { status: 'Đã xong' });

  // ── 9. Trả về kết quả ────────────────────────────────────────────────────────
  return {
    card: updatedCard,
    payment_id: paymentData.payment_id,
    order_code: orderCode,
    reissue_fee: REISSUE_FEE,
    payUrl
  };
};

/**
 * Lấy toàn bộ lịch sử xử lý (audit trail) để hiển thị cho quản lý.
 */
export const getAllHistory = async () => {
  const logs = await lostCardRepository.getAllActivityLogs();

  return logs.map((log) => ({
    log_id: log.log_id,
    action: log.action,
    // Với log 'Thẻ đã cấp lại': card.code là mã MỚI, nhưng old_data.code chứa mã CŨ.
    // Ưu tiên hiển thị mã thẻ ở thời điểm thực hiện hành động (old_data.code nếu có).
    card_code: log.old_data?.code || log.card?.code || "---",
    plate_number: log.plate_number,
    old_data: log.old_data,
    new_data: log.new_data,
    note: log.note,
    performed_by_name: log.profiles?.full_name || "Hệ thống",
    performed_at: log.performed_at
  }));
};