import supabase from "../config/supabaseClient.js";

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
      reported_at,
      status,
      description,
      handled_by,
      card ( code, type ),
      vehicle (
        plate_number,
        customer ( full_name )
      ),
      profiles ( full_name )
    `)
    .order('reported_at', { ascending: false });

  if (buildingId) {
    query = query.eq('building_id', buildingId);
  }

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

/**
 * Tìm một báo cáo mất thẻ theo ID
 * @param {string} reportId
 * @returns {Promise<object|null>}
 */
export const findLostReport = async (reportId) => {
  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, card_id, vehicle_id, status, handled_by')
    .eq('lost_report_id', reportId)
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
  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, handled_by')
    .eq('lost_report_id', reportId)
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
  const { data, error } = await supabase
    .from('card_lost_log')
    .update(payload)
    .eq('lost_report_id', reportId)
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
  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, vehicle_id, card_id, vehicle ( plate_number )')
    .eq('lost_report_id', reportId)
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
  const { data } = await supabase
    .from('card_activity_logs')
    .select('old_data')
    .eq('card_id', cardId)
    .eq('action', 'Thẻ đã khóa')
    .ilike('note', `%${reportId}%`)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.old_data?.code ?? null;
};
