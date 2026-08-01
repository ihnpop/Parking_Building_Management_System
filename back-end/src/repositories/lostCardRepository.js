import supabase from "../config/supabaseClient.js";
import { config } from "../config/config.js";

/**
 * Lấy toàn bộ nhật ký mất thẻ (kèm thông tin thẻ, xe, khách, nhân viên)
 * @returns {Promise<object[]>}
 */
export const getLostCardLogs = async (buildingId = null) => {
  let query = supabase
    .from('card_lost_log')
    .select(`
      lost_report_id,
      card_id,
      vehicle_id,
      reported_at,
      status,
      description,
      handled_by,
      vehicle_registration_image_url,
      id_card_image_url,
      card ( code, type ),
      vehicle (
        plate_number,
        customer ( full_name )
      ),
      profiles ( full_name )
    `)
    .order('reported_at', { ascending: false });

  // Lưu ý: bảng card_lost_log không có cột building_id,
  // nên không thể filter trực tiếp. Trả về toàn bộ nhật ký.
  const { data, error } = await query;

  if (error) {
    console.error('Lỗi khi truy vấn nhật ký mất thẻ:', error);
    throw new Error(error.message);
  }
  return data || [];
};

/**
 * Tìm các báo cáo mất thẻ chưa đóng của một thẻ
 * @param {string} cardId
 * @param {string[]} closedStatuses - Danh sách status được coi là "đã đóng"
 * @returns {Promise<object[]>}
 */
export const findOpenLostReports = async (cardId, closedStatuses) => {
  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status')
    .eq('card_id', cardId)
    .not('status', 'in', `(${closedStatuses.map(s => `"${s}"`).join(',')})`)
    .limit(1);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Tìm báo cáo mất thẻ chưa hoàn tất (trạng thái khác 'Đã xong' và khác 'Đã hủy (tạo nhầm)') của một xe
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findUnfinishedLostReportByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, reported_at')
    .eq('vehicle_id', vehicleId)
    .not('status', 'in', '("Đã xong","Đã xử lý xong","Hoàn thành","Đã hủy (tạo nhầm)")')
    .order('reported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm thẻ đã đăng ký với xe theo bảng card_registrations (bất kể status)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findAnyRegistrationByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('card_id')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm thẻ active đã đăng ký với xe
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveCardByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select('card_id')
    .eq('vehicle_id', vehicleId)
    .in('status', ['Hoạt động'])
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm thẻ đã đăng ký qua bảng parking_sessions (fallback khi không có registration)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findCardByParkingOrder = async (vehicleId) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .select('card_id')
    .eq('vehicle_id', vehicleId)
    .not('card_id', 'is', null)
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo bản ghi mới trong bảng card_lost_log
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const insertLostCardLog = async (payload) => {
  const { data, error } = await supabase
    .from('card_lost_log')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const isUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * Tìm `lost_report_id` thực sự (UUID) từ string `reportId` (có thể là UUID đầy đủ hoặc short code 8 ký tự hoặc prefix)
 */
export const resolveRealReportId = async (reportId) => {
  if (!reportId) return null;
  if (isUUID(reportId)) return reportId;

  const cleanHex = reportId.replace(/^LOST-/i, '').toLowerCase();

  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id')
    .order('reported_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Lỗi khi resolveRealReportId:', error.message);
    return null;
  }

  const match = data?.find(r =>
    r.lost_report_id === reportId ||
    r.lost_report_id.toLowerCase().startsWith(cleanHex) ||
    r.lost_report_id.toLowerCase().replace(/-/g, '').startsWith(cleanHex)
  );

  return match?.lost_report_id || null;
};

/**
 * Tìm một báo cáo mất thẻ theo ID
 * @param {string} reportId
 * @returns {Promise<object|null>}
 */
export const findLostReport = async (reportId) => {
  const realId = await resolveRealReportId(reportId);
  if (!realId) return null;

  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, card_id, vehicle_id, status, handled_by')
    .eq('lost_report_id', realId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm báo cáo mất thẻ theo ID (chỉ lấy status và handled_by)
 * @param {string} reportId
 * @returns {Promise<object|null>}
 */
export const findLostReportStatus = async (reportId) => {
  const realId = await resolveRealReportId(reportId);
  if (!realId) return null;

  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, handled_by')
    .eq('lost_report_id', realId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật trạng thái báo cáo mất thẻ
 * @param {string} reportId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const updateLostReport = async (reportId, payload) => {
  const realId = await resolveRealReportId(reportId);
  if (!realId) throw new Error(`Không tìm thấy báo cáo mất thẻ tương ứng với mã: ${reportId}`);

  const { data, error } = await supabase
    .from('card_lost_log')
    .update(payload)
    .eq('lost_report_id', realId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Ghi audit log vào bảng card_activity_logs
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const insertActivityLog = async (payload) => {
  const { error } = await supabase
    .from('card_activity_logs')
    .insert(payload);

  if (error) {
    console.error('Lỗi khi ghi audit log card_activity_logs:', error.message);
  }
};

/**
 * Tìm registration mới nhất (theo created_at) của cặp card+vehicle để điền vào audit log
 * @param {string} cardId
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findRegForAudit = async (cardId, vehicleId) => {
  const { data } = await supabase
    .from('card_registrations')
    .select('registration_id')
    .eq('card_id', cardId)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
};

/**
 * Lấy toàn bộ lịch sử hoạt động (audit trail) của tất cả các thẻ, kèm tên người thực hiện và mã thẻ
 * @returns {Promise<object[]>}
 */
export const getAllActivityLogs = async () => {
  const { data, error } = await supabase
    .from('card_activity_logs')
    .select(`
      log_id,
      action,
      plate_number,
      old_data,
      new_data,
      note,
      performed_at,
      card ( code ),
      profiles ( full_name )
    `)
    .in('action', ['Thẻ đã khóa', 'Thẻ đã mở khóa', 'Thẻ đã xóa', 'Thẻ đã cấp lại'])
    .order('performed_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Tìm báo cáo mất thẻ theo ID kèm thông tin biển số xe (dùng để xác thực khi cấp lại thẻ)
 * @param {string} reportId
 * @returns {Promise<object|null>} { lost_report_id, status, vehicle_id, vehicle: { plate_number } }
 */
export const findLostReportByIdWithVehicle = async (reportId) => {
  const realId = await resolveRealReportId(reportId);
  if (!realId) return null;

  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, vehicle_id, card_id, vehicle ( plate_number )')
    .eq('lost_report_id', realId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy snapshot mã thẻ tại thời điểm báo mất từ audit log.
 * Tìm log có action = 'Thẻ đã khóa' cho card_id đó, sắp xếp mới nhất.
 * Mã cũ được lưu trong old_data.code kể từ khi ta cập nhật createLostCard.
 * @param {string} cardId
 * @param {string} reportId - dùng để xác định log thuộc đúng report
 * @returns {Promise<string|null>} mã RFID lúc báo mất
 */
export const getCodeSnapshotByReportId = async (cardId, reportId) => {
  const realId = (await resolveRealReportId(reportId)) || reportId;

  const { data } = await supabase
    .from('card_activity_logs')
    .select('old_data')
    .eq('card_id', cardId)
    .eq('action', 'Thẻ đã khóa')
    .ilike('note', `%${realId}%`)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.old_data?.code ?? null;
};

/**
 * Tìm phiên gửi xe đang hoạt động (xe đang trong bãi) theo vehicle_id
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveParkingSession = async (vehicleId) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .select('session_id, entry_time, card_id, vehicle_id, plate_number, status')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'Đang gửi xe')
    .is('exit_time', null)
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Đóng phiên gửi xe khi hoàn tất thanh toán mất thẻ lượt
 * @param {string} sessionId
 * @param {number} finalFee - Phí gửi xe thực tế
 * @returns {Promise<object>}
 */
export const closeSessionForLostCard = async (sessionId, finalFee) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .update({
      exit_time: new Date().toISOString(),
      status: 'Hoàn thành',
      final_fee: finalFee
    })
    .eq('session_id', sessionId)
    .select()
    .single();

  if (error) throw new Error("Lỗi khi đóng phiên gửi xe: " + error.message);
  return data;
};

/**
 * Tìm phiên gửi xe theo ID
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
export const findSessionById = async (sessionId) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy phí cấp lại/mất thẻ từ bảng price_table active (fallback 50.000đ nếu chưa cấu hình)
 * @param {string|null} vehicleId
 * @param {string|null} buildingId
 * @returns {Promise<number>}
 */

/**
 * Tìm payment đang ở trạng thái 'Chờ thanh toán' cho một báo cáo mất thẻ cụ thể.
 * Dùng để ngăn tạo phiếu thu trùng lặp cho cùng một reportId.
 * @param {string} reportId - UUID của báo cáo mất thẻ
 * @param {string} paymentType - 'Phí cấp lại thẻ' | 'Phí mất thẻ lượt'
 * @returns {Promise<object|null>} payment record hoặc null nếu chưa có
 */
export const findPendingPaymentByReportId = async (reportId, paymentType) => {
  const { data, error } = await supabase
    .from('payment')
    .select('payment_id, order_code, amount, payment_method, status')
    .eq('payment_type', paymentType)
    .eq('status', 'Chờ thanh toán')
    .filter('note->>reportId', 'eq', reportId)
    .order('payment_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const getCardReissueFee = async (vehicleId = null, buildingId = null) => {
  try {
    let parkingId = null;

    if (buildingId) {
      const { data: parking } = await supabase
        .from('parking')
        .select('parking_id')
        .eq('building_id', buildingId)
        .limit(1)
        .maybeSingle();
      parkingId = parking?.parking_id;
    }

    if (!parkingId && vehicleId) {
      const { data: sess } = await supabase
        .from('parking_sessions')
        .select('slot:slot_id(area:area_id(floor:floor_id(parking_id)))')
        .eq('vehicle_id', vehicleId)
        .order('entry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      parkingId = sess?.slot?.area?.floor?.parking_id || null;
    }

    let query = supabase
      .from('price_table')
      .select('card_reissue_fee')
      .eq('status', 'Hoạt động');

    if (parkingId) {
      query = query.eq('parking_id', parkingId);
    }

    const { data, error } = await query.limit(1);

    if (error || !data || data.card_reissue_fee == null) {
      return 0;
    }

    return Number(data.card_reissue_fee) || 0;
  } catch (err) {
    console.error('Lỗi khi lấy card_reissue_fee từ DB, fallback 0:', err.message);
    return 0;
  }
};


