/**
 * renewalRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho nghiệp vụ Gia hạn thẻ tháng.
 * Tập trung toàn bộ Supabase queries, để renewalService chỉ chứa business logic.
 */

import supabase from '../config/supabaseClient.js';

// ─────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────

/**
 * Lấy thông tin thẻ tháng cần thiết cho kiểm tra điều kiện gia hạn.
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export async function findCardForRenewal(cardId) {
    const { data, error } = await supabase
        .from('card')
        .select('card_id, code, type, status, expired_date, active_vehicle_package_id')
        .eq('card_id', cardId)
        .single();
    if (error) throw new Error('Lỗi truy vấn thẻ: ' + error.message);
    return data;
}

/**
 * Lấy thông tin thẻ kèm join sâu (vehicle, customer, vehicle_package)
 * dùng cho getRenewalInfo — hiển thị dialog gia hạn.
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export async function findCardWithDetails(cardId) {
    const { data, error } = await supabase
        .from('card')
        .select(`
            card_id, code, type, status, expired_date,
            card_registrations (
                registration_id, status,
                vehicle (
                    vehicle_id, plate_number,
                    vehicle_type ( vehicle_type_id, name ),
                    customer ( full_name, phone ),
                    vehicle_package (
                        vehicle_package_id, start_date, end_date, status, renewal_type, package_id
                    )
                )
            )
        `)
        .eq('card_id', cardId)
        .single();
    if (error) throw new Error('Lỗi truy vấn thông tin thẻ: ' + error.message);
    return data;
}

/**
 * Cập nhật thẻ sau khi gia hạn thành công:
 * - expired_date → ngày hết hạn mới
 * - active_vehicle_package_id → VP mới
 * @param {string} cardId
 * @param {string} newExpiry  - 'YYYY-MM-DD'
 * @param {string} newVpId
 */
export async function updateCardAfterRenewal(cardId, newExpiry, newVpId) {
    const { error } = await supabase
        .from('card')
        .update({
            expired_date: newExpiry,
            active_vehicle_package_id: newVpId,
        })
        .eq('card_id', cardId);
    if (error) throw new Error('Lỗi cập nhật thẻ: ' + error.message);
}

/**
 * Xóa liên kết active_vehicle_package_id trên các thẻ có VP trong danh sách vpIds.
 * Dùng trong batch expiry job.
 * @param {string[]} vpIds
 */
export async function clearActiveVehiclePackage(vpIds) {
    const { error } = await supabase
        .from('card')
        .update({ active_vehicle_package_id: null })
        .in('active_vehicle_package_id', vpIds);
    if (error) throw new Error('Lỗi xóa active_vehicle_package: ' + error.message);
}

// ─────────────────────────────────────────────────────────────
// CARD_REGISTRATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Tìm registration đang hoạt động ('Hoạt động') của một thẻ.
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export async function findActiveRegistration(cardId) {
    const { data, error } = await supabase
        .from('card_registrations')
        .select('registration_id, vehicle_id, status')
        .eq('card_id', cardId)
        .eq('status', 'Hoạt động')
        .maybeSingle();
    if (error) throw new Error('Lỗi truy vấn đăng ký thẻ: ' + error.message);
    return data;
}

// ─────────────────────────────────────────────────────────────
// VEHICLE_PACKAGE
// ─────────────────────────────────────────────────────────────

/**
 * Tìm vehicle_package đang hoạt động mới nhất của một xe.
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export async function findActiveVehiclePackage(vehicleId) {
    const { data, error } = await supabase
        .from('vehicle_package')
        .select('vehicle_package_id, package_id, start_date, end_date, status, renewal_type')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'Hoạt động')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw new Error('Lỗi truy vấn gói thẻ tháng: ' + error.message);
    return data;
}

/**
 * Cập nhật vehicle_package cũ → status 'Hết hạn'.
 * Phải gọi TRƯỚC khi insert VP mới để tránh vi phạm unique constraint.
 * @param {string} vehiclePackageId
 */
export async function expireVehiclePackage(vehiclePackageId) {
    const { error } = await supabase
        .from('vehicle_package')
        .update({ status: 'Hết hạn' })
        .eq('vehicle_package_id', vehiclePackageId);
    if (error) throw new Error('Lỗi cập nhật kỳ cũ: ' + error.message);
}

/**
 * Insert vehicle_package mới cho kỳ gia hạn.
 * @param {object} data - { vehicle_id, package_id, start_date, end_date, status, renewal_type, previous_vehicle_package_id }
 * @returns {Promise<object>} - bản ghi mới được insert
 */
export async function insertNewVehiclePackage(data) {
    const { data: newVp, error } = await supabase
        .from('vehicle_package')
        .insert(data)
        .select()
        .single();
    if (error) throw new Error('Lỗi tạo kỳ gia hạn: ' + error.message);
    return newVp;
}

/**
 * Tìm tất cả vehicle_package đã quá hạn nhưng vẫn đang 'Hoạt động'.
 * Dùng trong batch expiry job (BR-11).
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {Promise<object[]>}
 */
export async function findExpiredVehiclePackages(today) {
    const { data, error } = await supabase
        .from('vehicle_package')
        .select('vehicle_package_id, vehicle_id, end_date')
        .eq('status', 'Hoạt động')
        .lt('end_date', today);
    if (error) throw new Error('Lỗi truy vấn VP hết hạn: ' + error.message);
    return data || [];
}

/**
 * Batch update: đánh dấu danh sách vehicle_package → 'Hết hạn'.
 * @param {string[]} vpIds
 */
export async function expireVehiclePackagesBatch(vpIds) {
    const { error } = await supabase
        .from('vehicle_package')
        .update({ status: 'Hết hạn' })
        .in('vehicle_package_id', vpIds);
    if (error) throw new Error('Lỗi batch expire VP: ' + error.message);
}

// ─────────────────────────────────────────────────────────────
// PACKAGE
// ─────────────────────────────────────────────────────────────

/**
 * Lấy thông tin gói thẻ tháng theo ID (snapshot giá tại thời điểm gia hạn — BR-14).
 * @param {string} packageId
 * @returns {Promise<object|null>}
 */
export async function findPackageById(packageId) {
    const { data, error } = await supabase
        .from('package')
        .select('package_id, name, price, duration_month, status')
        .eq('package_id', packageId)
        .single();
    if (error) throw new Error('Lỗi truy vấn gói: ' + error.message);
    return data;
}

/**
 * Lấy danh sách gói thẻ tháng đang hoạt động theo loại xe.
 * Dùng để hiển thị dropdown chọn gói trong dialog gia hạn.
 * @param {string} vehicleTypeId
 * @param {string} [userId]
 * @returns {Promise<object[]>}
 */
export async function findAvailablePackages(vehicleTypeId, userId) {
    let query = supabase
        .from('package')
        .select('package_id, name, price, duration_month, price_table_id')
        .eq('vehicle_type_id', vehicleTypeId)
        .eq('status', 'Hoạt động');

    if (userId) {
        // Lấy building_id từ profiles của user
        const { data: profile } = await supabase
            .from('profiles')
            .select('building_id')
            .eq('id', userId)
            .maybeSingle();

        if (profile?.building_id) {
            // Tìm các parking thuộc building
            const { data: parkings } = await supabase
                .from('parking')
                .select('parking_id')
                .eq('building_id', profile.building_id);

            const parkingIds = parkings?.map(p => p.parking_id) || [];
            if (parkingIds.length > 0) {
                // Tìm price_table của các parking này
                const { data: priceTables } = await supabase
                    .from('price_table')
                    .select('price_table_id')
                    .in('parking_id', parkingIds);

                const priceTableIds = priceTables?.map(pt => pt.price_table_id) || [];
                if (priceTableIds.length > 0) {
                    // Lọc theo các price_table này hoặc price_table_id is null (để không mất các package cũ)
                    query = query.or(`price_table_id.is.null,price_table_id.in.(${priceTableIds.map(id => `"${id}"`).join(',')})`);
                } else {
                    query = query.is('price_table_id', null);
                }
            } else {
                query = query.is('price_table_id', null);
            }
        } else {
            query = query.is('price_table_id', null);
        }
    }

    const { data, error } = await query.order('duration_month', { ascending: true });
    if (error) throw new Error('Lỗi truy vấn danh sách gói: ' + error.message);
    return data || [];
}


// ─────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────

/**
 * Kiểm tra có payment 'Chờ thanh toán' chưa timeout cho một VP không (BR-06).
 * @param {string} vehiclePackageId
 * @param {string} timeoutThreshold - ISO timestamp, chỉ lấy payment sau mốc này
 * @returns {Promise<object|null>}
 */
export async function findPendingRenewalPayment(vehiclePackageId, timeoutThreshold) {
    const { data, error } = await supabase
        .from('payment')
        .select('payment_id, order_code, payment_time')
        .eq('vehicle_package_id', vehiclePackageId)
        .eq('status', 'Chờ thanh toán')
        .eq('payment_type', 'Gia hạn thẻ tháng')
        .gte('payment_time', timeoutThreshold)
        .maybeSingle();
    if (error) throw new Error('Lỗi kiểm tra payment pending: ' + error.message);
    return data;
}

/**
 * Lấy chi tiết payment 'Chờ thanh toán' để hiển thị trong getRenewalInfo.
 * Trả về thêm các trường: amount, payment_method, note, payment_time.
 * @param {string} vehiclePackageId
 * @param {string} timeoutThreshold
 * @returns {Promise<object|null>}
 */
export async function findPendingRenewalPaymentDetail(vehiclePackageId, timeoutThreshold) {
    const { data, error } = await supabase
        .from('payment')
        .select('payment_id, order_code, amount, payment_method, note, payment_time')
        .eq('vehicle_package_id', vehiclePackageId)
        .eq('status', 'Chờ thanh toán')
        .eq('payment_type', 'Gia hạn thẻ tháng')
        .gte('payment_time', timeoutThreshold)
        .maybeSingle();
    if (error) throw new Error('Lỗi truy vấn payment pending detail: ' + error.message);
    return data;
}

/**
 * Cập nhật vehicle_package_id trên payment sau khi VP mới được tạo.
 * Dùng để truy vết payment → kỳ gia hạn mới.
 * @param {string} orderCode
 * @param {string} newVpId
 */
export async function linkPaymentToNewVehiclePackage(orderCode, newVpId) {
    const { error } = await supabase
        .from('payment')
        .update({ vehicle_package_id: newVpId })
        .eq('order_code', orderCode);
    if (error) throw new Error('Lỗi cập nhật payment → VP mới: ' + error.message);
}

// ─────────────────────────────────────────────────────────────
// CARD_ACTIVITY_LOGS
// ─────────────────────────────────────────────────────────────

/**
 * Ghi nhật ký hoạt động gia hạn thẻ tháng vào bảng card_activity_logs.
 * @param {object} logData
 * @param {string} logData.card_id
 * @param {string} logData.registration_id
 * @param {string} logData.action
 * @param {number} logData.duration_months
 * @param {number} logData.amount
 * @param {string} logData.expired_date_before
 * @param {string} logData.expired_date_after
 * @param {object} logData.new_data
 * @param {object} logData.old_data
 * @param {string} logData.note
 * @param {string|null} logData.performed_by
 * @param {string} logData.performed_at
 */
export async function insertRenewalActivityLog(logData) {
    const { error } = await supabase
        .from('card_activity_logs')
        .insert(logData);
    if (error) throw new Error('Lỗi ghi activity log: ' + error.message);
}
