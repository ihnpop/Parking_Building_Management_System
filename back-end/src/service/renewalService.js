/**
 * renewalService.js
 * Service xử lý nghiệp vụ Gia hạn thẻ tháng (Nhánh A — Gia hạn nối tiếp).
 *
 * Chỉ hỗ trợ gia hạn khi thẻ CÒN HẠN (status='Hoạt động', end_date >= TODAY).
 * Nếu thẻ đã hết hạn → trả lỗi, hướng dẫn dùng chức năng Đăng ký thẻ tháng mới.
 *
 * Luồng:
 *   1. checkRenewalEligibility(cardId) — kiểm tra điều kiện đầu vào
 *   2. initiateRenewal(...) — tạo payment 'Chờ thanh toán' + VNPay URL
 *   3. confirmRenewalCash(orderCode) — xác nhận tiền mặt (cashier)
 *   4. processRenewalSuccess(orderCode) — ghi DB sau khi payment thành công
 */

import * as renewalRepository from '../repositories/renewalRepository.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as vnpayService from './vnpayService.js';

// Timeout mặc định cho payment pending (phút)
const PAYMENT_TIMEOUT_MINUTES = 15;

// Ánh xạ mã nội bộ → nhãn tiếng Việt theo ràng buộc DB (payment_method_check)
// DB constraint: CHECK (payment_method IN ('Tiền mặt', 'VNPay'))
function mapPaymentMethod(method) {
    if (!method) return null;
    const m = method.toLowerCase();
    if (m === 'cash') return 'Tiền mặt';
    if (m === 'vnpay') return 'VNPay';
    return method; // giữ nguyên nếu không khớp
}

// ─────────────────────────────────────────────────────────────
// Helper: Cộng tháng an toàn (tránh tràn ngày cuối tháng)
// ─────────────────────────────────────────────────────────────
function addMonthsSafely(dateStr, months) {
    const d = new Date(dateStr);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    // Xử lý trường hợp tràn ngày: 31/01 + 1 tháng → 03/03 → điều chỉnh về 28/02
    if (d.getDate() !== day) {
        d.setDate(0);
    }
    return d.toISOString().split('T')[0]; // Trả về 'YYYY-MM-DD'
}

// Helper: Format date sang 'YYYY-MM-DD'
function toDateStr(date) {
    return new Date(date).toISOString().split('T')[0];
}

// Helper: Cộng thêm 1 ngày
function addOneDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────
// 1. Kiểm tra điều kiện gia hạn
// ─────────────────────────────────────────────────────────────
/**
 * Kiểm tra xem thẻ tháng có đủ điều kiện gia hạn nối tiếp (Nhánh A) không.
 * @param {string} cardId - UUID của card
 * @returns {Promise<{card, registration, vehiclePackage, currentExpiry: string}>}
 * @throws {Error} nếu không đủ điều kiện (kèm message mô tả lý do)
 */
export async function checkRenewalEligibility(cardId) {
    // 1. Lấy thông tin thẻ
    const card = await renewalRepository.findCardForRenewal(cardId);
    if (!card) {
        throw new Error('Không tìm thấy thẻ tháng.');
    }
    if (card.type !== 'Thẻ tháng') {
        throw new Error('Chỉ hỗ trợ gia hạn thẻ tháng.');
    }
    if (card.status === 'Đã khóa' || card.status === 'Đã xóa') {
        throw new Error(`Thẻ ${card.code} đã bị khóa, không thể gia hạn.`);
    }

    // 2. Kiểm tra ngày hết hạn (BR-03): nếu đã qua end_date → không gia hạn
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = card.expired_date ? new Date(card.expired_date) : null;

    if (!expiryDate || expiryDate < today) {
        throw new Error(
            `thẻ tháng ${card.code} đã hết hạn. Vui lòng sử dụng chức năng "Đăng ký thẻ tháng mới" để tiếp tục sử dụng dịch vụ.`
        );
    }

    // 3. Lấy registration đang hoạt động
    const registration = await renewalRepository.findActiveRegistration(cardId);
    if (!registration) {
        throw new Error('Không tìm thấy liên kết đăng ký thẻ đang hoạt động.');
    }

    // 4. Lấy vehicle_package đang hoạt động của xe
    const vehiclePackage = await renewalRepository.findActiveVehiclePackage(registration.vehicle_id);
    if (!vehiclePackage) {
        throw new Error('Không tìm thấy gói thẻ tháng đang hoạt động.');
    }

    // 5. Kiểm tra không có pending payment đang chờ xử lý (BR-06)
    const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    const pendingPayment = await renewalRepository.findPendingRenewalPayment(
        vehiclePackage.vehicle_package_id,
        timeoutThreshold
    );

    if (pendingPayment) {
        throw new Error(
            `Đang có giao dịch gia hạn chờ thanh toán (mã: ${pendingPayment.order_code}). Vui lòng hoàn tất hoặc đợi 15 phút để thử lại.`
        );
    }

    return {
        card,
        registration,
        vehiclePackage,
        currentExpiry: vehiclePackage.end_date, // 'YYYY-MM-DD'
    };
}

// ─────────────────────────────────────────────────────────────
// 2. Khởi tạo giao dịch gia hạn
// ─────────────────────────────────────────────────────────────
/**
 * Tạo payment record 'Chờ thanh toán' và trả về VNPay URL (nếu online).
 * @param {object} params
 * @param {string} params.cardId
 * @param {string} params.packageId - UUID của gói mới từ bảng package
 * @param {'vnpay'|'cash'} params.paymentMethod
 * @param {string} params.ipAddr
 * @param {string} params.userId - ID người thực hiện
 * @returns {Promise<{orderCode, payUrl, amount, newExpiry}>}
 */
export async function initiateRenewal({ cardId, packageId, paymentMethod, ipAddr, userId, origin }) {
    // Kiểm tra điều kiện đầu vào
    const { card, registration, vehiclePackage, currentExpiry } = await checkRenewalEligibility(cardId);

    // Lấy thông tin gói đã chọn (snapshot giá - BR-14)
    const pkg = await renewalRepository.findPackageById(packageId);
    if (!pkg) throw new Error('Không tìm thấy gói thẻ tháng đã chọn.');
    if (pkg.status !== 'Hoạt động') throw new Error('Gói thẻ tháng đã chọn không còn khả dụng.');

    const amount = Number(pkg.price);
    const durationMonth = Number(pkg.duration_month);

    // Tính ngày hiệu lực mới để hiển thị preview (BR-08)
    const newStartDate = addOneDay(currentExpiry); // start = expiry + 1
    const newExpiry = addMonthsSafely(newStartDate, durationMonth);

    // Tạo mã đơn hàng duy nhất
    const orderCode = `RN${Date.now()}`; // RN = Renewal

    // Lưu payload đầy đủ vào payment.note để processRenewalSuccess đọc lại
    const savedPayload = {
        cardId,
        registrationId: registration.registration_id,
        vehiclePackageId: vehiclePackage.vehicle_package_id,
        vehicleId: registration.vehicle_id,
        packageId: pkg.package_id,
        packageName: pkg.name,
        durationMonth,
        amount,
        currentExpiry,
        newStartDate,
        newExpiry,
        cardCode: card.code,
    };

    // Tạo payment record
    // Lưu ý: mapPaymentMethod chuyển 'cash' → 'Tiền mặt', 'vnpay' → 'VNPay'
    // để khớp với ràng buộc CHECK của DB (payment_method_check)
    await paymentRepository.create({
        vehicle_package_id: vehiclePackage.vehicle_package_id,
        payment_type: 'Gia hạn thẻ tháng',
        amount,
        order_code: orderCode,
        status: 'Chờ thanh toán',
        payment_method: mapPaymentMethod(paymentMethod),
        created_by: userId || null,
        note: savedPayload,
    });

    let payUrl = null;
    if (paymentMethod === 'vnpay') {
        payUrl = vnpayService.createPaymentUrl({
            orderCode,
            amount,
            orderInfo: `Gia han ve thang ${card.code}`,
            ipAddr: ipAddr || '127.0.0.1',
            origin,
        });
    }

    return {
        orderCode,
        payUrl,
        amount,
        currentExpiry,
        newExpiry,
        packageName: pkg.name,
    };
}

// ─────────────────────────────────────────────────────────────
// 3. Xác nhận thu tiền mặt (dành cho cashier)
// ─────────────────────────────────────────────────────────────
/**
 * Cashier xác nhận đã thu tiền mặt → cập nhật payment → xử lý gia hạn.
 * @param {string} orderCode
 */
export async function confirmRenewalCash(orderCode) {
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) throw new Error('Không tìm thấy giao dịch.');
    if (payment.payment_method !== 'Tiền mặt') throw new Error('Giao dịch không phải tiền mặt.');
    if (payment.status !== 'Chờ thanh toán') {
        throw new Error('Giao dịch đã được xử lý trước đó.');
    }
    if (payment.payment_type !== 'Gia hạn thẻ tháng') {
        throw new Error('Giao dịch này không phải gia hạn thẻ tháng.');
    }

    // Cập nhật trạng thái payment
    await paymentRepository.updateStatus(orderCode, {
        status: 'Đã thanh toán',
        paid_at: new Date().toISOString(),
    });

    // Thực thi gia hạn
    return await processRenewalSuccess(orderCode);
}

// ─────────────────────────────────────────────────────────────
// 4. Xử lý gia hạn sau khi payment thành công
// ─────────────────────────────────────────────────────────────
/**
 * Thực thi toàn bộ DB operations sau khi payment được confirm.
 * Được gọi từ:
 *   - confirmRenewalCash (tiền mặt)
 *   - paymentService.handleIpn (VNPay callback)
 * @param {string} orderCode
 */
export async function processRenewalSuccess(orderCode) {
    // Lấy thông tin payment và payload đã lưu
    const payment = await paymentRepository.findByOrderCode(orderCode);
    if (!payment) throw new Error('Không tìm thấy giao dịch: ' + orderCode);
    if (payment.status !== 'Đã thanh toán') {
        throw new Error('Giao dịch chưa được xác nhận thanh toán.');
    }

    // note là jsonb — Supabase trả về object trực tiếp, không cần JSON.parse()
    const payload = payment.note;
    if (!payload || typeof payload !== 'object') {
        throw new Error('Dữ liệu giao dịch gia hạn không hợp lệ.');
    }

    const {
        cardId,
        registrationId,
        vehiclePackageId,
        vehicleId,
        packageId,
        durationMonth,
        amount,
        currentExpiry,
        newStartDate,
        newExpiry,
        cardCode,
    } = payload;

    // 1. UPDATE vehicle_package cũ → 'Hết hạn' TRƯỚC (tránh vi phạm unique constraint uq_vehicle_active_package)
    await renewalRepository.expireVehiclePackage(vehiclePackageId);

    // 2. INSERT vehicle_package mới (kỳ gia hạn)
    const newVp = await renewalRepository.insertNewVehiclePackage({
        vehicle_id: vehicleId,
        package_id: packageId,
        start_date: newStartDate,
        end_date: newExpiry,
        status: 'Hoạt động',
        renewal_type: 'Gia hạn nối tiếp',
        previous_vehicle_package_id: vehiclePackageId,
    });

    // 3. UPDATE card: expired_date + active_vehicle_package_id
    await renewalRepository.updateCardAfterRenewal(cardId, newExpiry, newVp.vehicle_package_id);

    // 4. UPDATE payment: gắn vehicle_package_id mới (để truy vết)
    await renewalRepository.linkPaymentToNewVehiclePackage(orderCode, newVp.vehicle_package_id);

    // 5. INSERT card_activity_logs
    await renewalRepository.insertRenewalActivityLog({
        card_id: cardId,
        registration_id: registrationId,
        action: 'Gia hạn nối tiếp',
        duration_months: durationMonth,
        amount: amount,
        expired_date_before: currentExpiry,
        expired_date_after: newExpiry,
        new_data: {
            vehicle_package_id: newVp.vehicle_package_id,
            start_date: newStartDate,
            end_date: newExpiry,
            package_id: packageId,
            order_code: orderCode,
        },
        old_data: {
            vehicle_package_id: vehiclePackageId,
            end_date: currentExpiry,
        },
        note: `Gia hạn thẻ tháng ${cardCode} qua ${payment.payment_method === 'vnpay' ? 'VNPay' : 'tiền mặt'} - Đơn: ${orderCode}`,
        performed_by: payment.created_by || null,
        performed_at: new Date().toISOString(),
    });

    return {
        success: true,
        cardCode,
        newExpiry,
        newStartDate,
        currentExpiry,
        vehiclePackageId: newVp.vehicle_package_id,
    };
}

// ─────────────────────────────────────────────────────────────
// 5. Lấy thông tin gia hạn (dành cho frontend preview)
// ─────────────────────────────────────────────────────────────
/**
 * Trả về thông tin cần thiết để hiển thị dialog gia hạn:
 * - Thông tin thẻ + thông tin xe + khách hàng
 * - Trạng thái (còn hạn / hết hạn)
 * - Danh sách gói thẻ tháng có thể chọn (theo loại xe)
 * @param {string} cardId
 * @param {string} [userId]
 */
export async function getRenewalInfo(cardId, userId, origin) {
    // Lấy thẻ + registration + vehicle + package
    const card = await renewalRepository.findCardWithDetails(cardId);
    if (!card) throw new Error('Không tìm thấy thẻ tháng.');

    const activeReg = card.card_registrations?.find(r => r.status === 'Hoạt động');
    const vehicle = activeReg?.vehicle;
    const vehicleTypeId = vehicle?.vehicle_type?.vehicle_type_id;

    // Gói đang hoạt động
    const activeVp = vehicle?.vehicle_package?.find(vp => vp.status === 'Hoạt động')
        || vehicle?.vehicle_package?.sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];

    // Kiểm tra còn hạn không
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = card.expired_date ? new Date(card.expired_date) : null;
    const isExpired = !expiryDate || expiryDate < today;

    // Lấy danh sách gói khả dụng theo loại xe (cho dropdown chọn gói)
    let availablePackages = [];
    if (vehicleTypeId && !isExpired) {
        availablePackages = await renewalRepository.findAvailablePackages(vehicleTypeId, userId);
    }


    // Kiểm tra xem có giao dịch gia hạn nào đang ở trạng thái 'Chờ thanh toán' và chưa bị timeout
    let pendingPayment = null;
    if (activeVp && !isExpired) {
        const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString();
        const pm = await renewalRepository.findPendingRenewalPaymentDetail(
            activeVp.vehicle_package_id,
            timeoutThreshold
        );
        if (pm) {
            let payUrl = null;
            if (pm.payment_method === 'VNPay') {
                // note là jsonb — Supabase trả về object trực tiếp
                const noteObj = (pm.note && typeof pm.note === 'object') ? pm.note : {};
                const cCode = noteObj.cardCode || card.code;
                payUrl = vnpayService.createPaymentUrl({
                    orderCode: pm.order_code,
                    amount: pm.amount,
                    orderInfo: `Gia han ve thang ${cCode}`,
                    ipAddr: '127.0.0.1',
                    origin,
                });
            }

            pendingPayment = {
                orderCode: pm.order_code,
                amount: pm.amount,
                paymentMethod: pm.payment_method === 'Tiền mặt' ? 'cash' : 'vnpay',
                payUrl,
                note: pm.note,
                paymentTime: pm.payment_time
            };
        }
    }

    return {
        cardId: card.card_id,
        cardCode: card.code,
        cardStatus: card.status,
        currentExpiry: card.expired_date,
        isExpired,
        daysUntilExpiry: expiryDate
            ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
            : null,
        vehicle: vehicle
            ? {
                vehicleId: vehicle.vehicle_id,
                plate: vehicle.plate_number,
                vehicleType: vehicle.vehicle_type?.name,
                vehicleTypeId,
                customerName: vehicle.customer?.full_name,
                customerPhone: vehicle.customer?.phone,
            }
            : null,
        activeVehiclePackage: activeVp
            ? {
                vehiclePackageId: activeVp.vehicle_package_id,
                startDate: activeVp.start_date,
                endDate: activeVp.end_date,
                packageId: activeVp.package_id,
            }
            : null,
        pendingPayment,
        availablePackages,
    };
}

// ─────────────────────────────────────────────────────────────
// 6. Batch job: tự động expire vehicle_package hết hạn (BR-11)
// ─────────────────────────────────────────────────────────────
/**
 * Chạy định kỳ (daily) để tự động chuyển vehicle_package hết hạn
 * và đồng bộ trạng thái thẻ tương ứng.
 */
export async function runExpiryJob() {
    const today = toDateStr(new Date());
    console.log(`[ExpiryJob] Running at ${today}...`);

    // 1. Lấy danh sách vehicle_package đã quá hạn nhưng vẫn 'Hoạt động'
    const expiredVps = await renewalRepository.findExpiredVehiclePackages(today);

    if (!expiredVps || expiredVps.length === 0) {
        console.log('[ExpiryJob] Không có gói nào hết hạn.');
        return { expired: 0 };
    }

    const vpIds = expiredVps.map(vp => vp.vehicle_package_id);

    // 2. UPDATE vehicle_package → 'Hết hạn'
    await renewalRepository.expireVehiclePackagesBatch(vpIds);

    // 3. Xóa liên kết active_vehicle_package_id trên các thẻ tương ứng
    await renewalRepository.clearActiveVehiclePackage(vpIds);

    console.log(`[ExpiryJob] Đã expire ${expiredVps.length} gói thẻ tháng.`);
    return { expired: expiredVps.length };
}
