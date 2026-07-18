/**
 * parkingRegistrationRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho luồng Đăng ký Vé tháng.
 * Tập trung toàn bộ thao tác Supabase liên quan đến:
 *   - Customer & CustomerKYC
 *   - Vehicle
 *   - Package
 *   - VehiclePackage
 *   - Card & CardRegistrations
 *   - Payment
 *   - CardActivityLogs
 */

import supabase from '../config/supabaseClient.js';

// ============================================================
// CUSTOMER
// ============================================================

/**
 * Tìm khách hàng theo số điện thoại
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
export const findCustomerByPhone = async (phone) => {
    const { data, error } = await supabase
        .from('customer')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    if (error) throw new Error('Lỗi tìm kiếm khách hàng: ' + error.message);
    return data;
};

/**
 * Tạo mới khách hàng
 * @param {{ full_name: string, phone: string, email: string, status: string }} payload
 * @returns {Promise<object>}
 */
export const createCustomer = async (payload) => {
    const { data, error } = await supabase
        .from('customer')
        .insert([payload])
        .select()
        .single();

    if (error) throw new Error('Lỗi tạo Customer: ' + error.message);
    return data;
};

/**
 * Cập nhật thông tin khách hàng
 * @param {string} customerId
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const updateCustomer = async (customerId, payload) => {
    const { error } = await supabase
        .from('customer')
        .update(payload)
        .eq('customer_id', customerId);

    if (error) throw new Error('Lỗi cập nhật khách hàng: ' + error.message);
};

/**
 * Ghi log xác thực eKYC cho khách hàng vào bảng customer_kyc
 * @param {{ customer_id: string, cccd_number: string, ekyc_status: string, verified_at: string }} payload
 * @returns {Promise<void>}
 */
export const createCustomerKyc = async (payload) => {
    const { error } = await supabase
        .from('customer_kyc')
        .insert([payload]);

    if (error) throw new Error('Lỗi lưu log KYC: ' + error.message);
};

// ============================================================
// VEHICLE
// ============================================================

/**
 * Tìm xe theo biển số (trả về vehicle_id, customer_id)
 * @param {string} plate
 * @returns {Promise<object|null>}
 */
export const findVehicleByPlate = async (plate) => {
    const { data, error } = await supabase
        .from('vehicle')
        .select('vehicle_id, customer_id')
        .eq('plate_number', plate)
        .maybeSingle();

    if (error) throw new Error('Lỗi truy vấn xe: ' + error.message);
    return data;
};

/**
 * Tạo mới xe
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createVehicle = async (payload) => {
    const { data, error } = await supabase
        .from('vehicle')
        .insert([payload])
        .select()
        .single();

    if (error) throw new Error('Lỗi tạo phương tiện: ' + error.message);
    return data;
};

/**
 * Cập nhật customer_id của xe
 * @param {string} vehicleId
 * @param {string} customerId
 * @returns {Promise<void>}
 */
export const updateVehicleCustomer = async (vehicleId, customerId) => {
    const { error } = await supabase
        .from('vehicle')
        .update({ customer_id: customerId })
        .eq('vehicle_id', vehicleId);

    if (error) throw new Error('Lỗi cập nhật xe: ' + error.message);
};

// ============================================================
// PACKAGE
// ============================================================

/**
 * Lấy thông tin gói cước theo package_id
 * @param {string} packageId
 * @returns {Promise<object|null>}
 */
export const findPackageById = async (packageId) => {
    const { data, error } = await supabase
        .from('package')
        .select('duration_month, price')
        .eq('package_id', packageId)
        .single();

    if (error || !data) throw new Error('Không tìm thấy gói cước đã chọn.');
    return data;
};

// ============================================================
// VEHICLE PACKAGE
// ============================================================

/**
 * Tạo mới vehicle_package (gói tháng cho xe)
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createVehiclePackage = async (payload) => {
    const { data, error } = await supabase
        .from('vehicle_package')
        .insert([payload])
        .select()
        .single();

    if (error) throw new Error('Lỗi gán gói cước cho xe: ' + error.message);
    return data;
};

// ============================================================
// PAYMENT
// ============================================================

/**
 * Kiểm tra payment trùng lặp trong vòng 1 phút gần nhất
 * @param {{ vehiclePackageId: string, paymentType: string, sinceTime: string }} params
 * @returns {Promise<object|null>}
 */
export const findDuplicatePayment = async ({ vehiclePackageId, paymentType, sinceTime }) => {
    const { data } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('vehicle_package_id', vehiclePackageId)
        .eq('payment_type', paymentType)
        .gte('payment_time', sinceTime)
        .maybeSingle();

    return data || null;
};

/**
 * Tạo mới payment record
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const createPaymentRecord = async (payload) => {
    const { error } = await supabase
        .from('payment')
        .insert(payload);

    if (error) throw new Error('Lỗi tạo payment record: ' + error.message);
};

/**
 * Liên kết payment record với vehicle_package_id mới (sau khi finalize)
 * @param {string} paymentId
 * @param {string} vehiclePackageId
 * @returns {Promise<void>}
 */
export const linkPaymentToVehiclePackage = async (paymentId, vehiclePackageId) => {
    const { error } = await supabase
        .from('payment')
        .update({ vehicle_package_id: vehiclePackageId })
        .eq('payment_id', paymentId);

    if (error) throw new Error('Lỗi liên kết hóa đơn thanh toán: ' + error.message);
};

// ============================================================
// CARD
// ============================================================

/**
 * Đếm số lượng thẻ tháng không ở trạng thái 'Đã xóa' (kiểm tra giới hạn 50)
 * @returns {Promise<number>}
 */
export const countActiveMonthCards = async () => {
    const { count, error } = await supabase
        .from('card')
        .select('card_id', { count: 'exact', head: true })
        .eq('type', 'Thẻ tháng')
        .not('status', 'eq', 'Đã xóa');

    if (error) throw new Error('Lỗi đếm số lượng thẻ tháng: ' + error.message);
    return count || 0;
};

/**
 * Tìm thẻ theo mã RFID (code)
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export const findCardByCode = async (code) => {
    const { data, error } = await supabase
        .from('card')
        .select('card_id, code, status')
        .eq('code', code)
        .maybeSingle();

    if (error) throw new Error('Lỗi kiểm tra thẻ RFID: ' + error.message);
    return data;
};

/**
 * Tạo thẻ tháng mới
 * @param {{ code: string, type: string, status: string, expired_date: string }} payload
 * @returns {Promise<object>}
 */
export const createCard = async (payload) => {
    const { data, error } = await supabase
        .from('card')
        .insert([payload])
        .select()
        .single();

    if (error) throw new Error('Lỗi tạo thẻ tháng mới: ' + error.message);
    return data;
};

/**
 * Kích hoạt thẻ đang chờ (cập nhật status → Hoạt động, expired_date, created_at)
 * @param {string} cardId
 * @param {{ status: string, expired_date: string, created_at: string }} payload
 * @returns {Promise<void>}
 */
export const activateCard = async (cardId, payload) => {
    const { error } = await supabase
        .from('card')
        .update(payload)
        .eq('card_id', cardId);

    if (error) throw new Error('Lỗi cập nhật trạng thái thẻ: ' + error.message);
};

// ============================================================
// CARD REGISTRATIONS
// ============================================================

/**
 * Tạo liên kết đăng ký giữa thẻ và xe (bảng card_registrations)
 * @param {{ card_id: string, vehicle_id: string, status: string }} payload
 * @returns {Promise<object>}
 */
export const createCardRegistration = async (payload) => {
    const { data, error } = await supabase
        .from('card_registrations')
        .insert([payload])
        .select()
        .single();

    if (error) throw new Error('Lỗi liên kết thẻ với xe: ' + error.message);
    return data;
};

// ============================================================
// CARD ACTIVITY LOGS
// ============================================================

/**
 * Ghi log hoạt động thẻ vào bảng card_activity_logs
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const createActivityLog = async (payload) => {
    const { error } = await supabase
        .from('card_activity_logs')
        .insert([payload]);

    if (error) console.warn('Lỗi ghi log hoạt động thẻ (bỏ qua):', error.message);
};
