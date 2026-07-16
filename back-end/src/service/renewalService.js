/**
 * renewalService.js
 * Service xử lý nghiệp vụ Gia hạn Vé tháng (Nhánh A — Gia hạn nối tiếp).
 *
 * Chỉ hỗ trợ gia hạn khi thẻ CÒN HẠN (status='Hoạt động', end_date >= TODAY).
 * Nếu thẻ đã hết hạn → trả lỗi, hướng dẫn dùng chức năng Đăng ký vé tháng mới.
 *
 * Luồng:
 *   1. checkRenewalEligibility(cardId) — kiểm tra điều kiện đầu vào
 *   2. initiateRenewal(...) — tạo payment 'Chờ thanh toán' + VNPay URL
 *   3. confirmRenewalCash(orderCode) — xác nhận tiền mặt (cashier)
 *   4. processRenewalSuccess(orderCode) — ghi DB sau khi payment thành công
 */

import supabase from '../config/supabaseClient.js';
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
    const { data: card, error: cardErr } = await supabase
        .from('card')
        .select('card_id, code, type, status, expired_date, active_vehicle_package_id')
        .eq('card_id', cardId)
        .single();

    if (cardErr || !card) {
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
            `Vé tháng ${card.code} đã hết hạn. Vui lòng sử dụng chức năng "Đăng ký vé tháng mới" để tiếp tục sử dụng dịch vụ.`
        );
    }

    // 3. Lấy registration đang hoạt động
    const { data: registration, error: regErr } = await supabase
        .from('card_registrations')
        .select('registration_id, vehicle_id, status')
        .eq('card_id', cardId)
        .eq('status', 'Hoạt động')
        .maybeSingle();

    if (regErr) throw new Error('Lỗi truy vấn đăng ký thẻ: ' + regErr.message);
    if (!registration) throw new Error('Không tìm thấy liên kết đăng ký thẻ đang hoạt động.');

    // 4. Lấy vehicle_package đang hoạt động của xe
    const { data: vehiclePackage, error: vpErr } = await supabase
        .from('vehicle_package')
        .select('vehicle_package_id, package_id, start_date, end_date, status, renewal_type')
        .eq('vehicle_id', registration.vehicle_id)
        .eq('status', 'Hoạt động')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (vpErr) throw new Error('Lỗi truy vấn gói vé tháng: ' + vpErr.message);
    if (!vehiclePackage) throw new Error('Không tìm thấy gói vé tháng đang hoạt động.');

    // 5. Kiểm tra không có pending payment đang chờ xử lý (BR-06)
    const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString();
    const { data: pendingPayment } = await supabase
        .from('payment')
        .select('payment_id, order_code, payment_time')
        .eq('vehicle_package_id', vehiclePackage.vehicle_package_id)
        .eq('status', 'Chờ thanh toán')
        .eq('payment_type', 'Gia hạn vé tháng')
        .gte('payment_time', timeoutThreshold) // Chỉ check payment chưa timeout
        .maybeSingle();

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
export async function initiateRenewal({ cardId, packageId, paymentMethod, ipAddr, userId }) {
    // Kiểm tra điều kiện đầu vào
    const { card, registration, vehiclePackage, currentExpiry } = await checkRenewalEligibility(cardId);

    // Lấy thông tin gói đã chọn (snapshot giá - BR-14)
    const { data: pkg, error: pkgErr } = await supabase
        .from('package')
        .select('package_id, name, price, duration_month, status')
        .eq('package_id', packageId)
        .single();

    if (pkgErr || !pkg) throw new Error('Không tìm thấy gói vé tháng đã chọn.');
    if (pkg.status !== 'Hoạt động') throw new Error('Gói vé tháng đã chọn không còn khả dụng.');

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
        payment_type: 'Gia hạn vé tháng',
        amount,
        order_code: orderCode,
        status: 'Chờ thanh toán',
        payment_method: mapPaymentMethod(paymentMethod),
        created_by: userId || null,
        note: JSON.stringify(savedPayload),
    });

    let payUrl = null;
    if (paymentMethod === 'vnpay') {
        payUrl = vnpayService.createPaymentUrl({
            orderCode,
            amount,
            orderInfo: `Gia han ve thang ${card.code}`,
            ipAddr: ipAddr || '127.0.0.1',
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
    if (payment.payment_type !== 'Gia hạn vé tháng') {
        throw new Error('Giao dịch này không phải gia hạn vé tháng.');
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

    let payload;
    try {
        payload = JSON.parse(payment.note);
    } catch {
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
    const { error: vpExpireErr } = await supabase
        .from('vehicle_package')
        .update({ status: 'Hết hạn' })
        .eq('vehicle_package_id', vehiclePackageId);

    if (vpExpireErr) throw new Error('Lỗi cập nhật kỳ cũ: ' + vpExpireErr.message);

    // 2. INSERT vehicle_package mới (kỳ gia hạn)
    const { data: newVp, error: vpInsertErr } = await supabase
        .from('vehicle_package')
        .insert({
            vehicle_id: vehicleId,
            package_id: packageId,
            start_date: newStartDate,
            end_date: newExpiry,
            status: 'Hoạt động',
            renewal_type: 'Gia hạn nối tiếp',
            previous_vehicle_package_id: vehiclePackageId,
        })
        .select()
        .single();

    if (vpInsertErr) throw new Error('Lỗi tạo kỳ gia hạn: ' + vpInsertErr.message);

    // 3. UPDATE card: expired_date + active_vehicle_package_id
    const { error: cardUpdateErr } = await supabase
        .from('card')
        .update({
            expired_date: newExpiry,
            active_vehicle_package_id: newVp.vehicle_package_id,
        })
        .eq('card_id', cardId);

    if (cardUpdateErr) throw new Error('Lỗi cập nhật thẻ: ' + cardUpdateErr.message);

    // 4. UPDATE payment: gắn vehicle_package_id mới (để truy vết)
    await supabase
        .from('payment')
        .update({ vehicle_package_id: newVp.vehicle_package_id })
        .eq('order_code', orderCode);

    // 5. INSERT card_activity_logs
    await supabase
        .from('card_activity_logs')
        .insert({
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
            note: `Gia hạn vé tháng ${cardCode} qua ${payment.payment_method === 'vnpay' ? 'VNPay' : 'tiền mặt'} - Đơn: ${orderCode}`,
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
 * - Danh sách gói vé tháng có thể chọn (theo loại xe)
 * @param {string} cardId
 */
export async function getRenewalInfo(cardId) {
    // Lấy thẻ + registration + vehicle + package
    const { data: card, error: cardErr } = await supabase
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

    if (cardErr || !card) throw new Error('Không tìm thấy thẻ tháng.');

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
        const { data: pkgs } = await supabase
            .from('package')
            .select('package_id, name, price, duration_month')
            .eq('vehicle_type_id', vehicleTypeId)
            .eq('status', 'Hoạt động')
            .order('duration_month', { ascending: true });
        availablePackages = pkgs || [];
    }

    // Kiểm tra xem có giao dịch gia hạn nào đang ở trạng thái 'Chờ thanh toán' và chưa bị timeout
    let pendingPayment = null;
    if (activeVp && !isExpired) {
        const timeoutThreshold = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString();
        const { data: pm } = await supabase
            .from('payment')
            .select('payment_id, order_code, amount, payment_method, note, payment_time')
            .eq('vehicle_package_id', activeVp.vehicle_package_id)
            .eq('status', 'Chờ thanh toán')
            .eq('payment_type', 'Gia hạn vé tháng')
            .gte('payment_time', timeoutThreshold)
            .maybeSingle();
        if (pm) {
            let payUrl = null;
            if (pm.payment_method === 'VNPay') {
                let noteObj = {};
                try {
                    noteObj = JSON.parse(pm.note) || {};
                } catch (e) {
                    console.error("Lỗi parse note:", e);
                }
                const cCode = noteObj.cardCode || card.code;
                payUrl = vnpayService.createPaymentUrl({
                    orderCode: pm.order_code,
                    amount: pm.amount,
                    orderInfo: `Gia han ve thang ${cCode}`,
                    ipAddr: '127.0.0.1',
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
        availablePackages,
        pendingPayment,
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
    const { data: expiredVps, error } = await supabase
        .from('vehicle_package')
        .select('vehicle_package_id, vehicle_id, end_date')
        .eq('status', 'Hoạt động')
        .lt('end_date', today);

    if (error) {
        console.error('[ExpiryJob] Lỗi truy vấn:', error.message);
        return { expired: 0, error: error.message };
    }

    if (!expiredVps || expiredVps.length === 0) {
        console.log('[ExpiryJob] Không có gói nào hết hạn.');
        return { expired: 0 };
    }

    const vpIds = expiredVps.map(vp => vp.vehicle_package_id);
    const vehicleIds = expiredVps.map(vp => vp.vehicle_id);

    // 2. UPDATE vehicle_package → 'Hết hạn'
    await supabase
        .from('vehicle_package')
        .update({ status: 'Hết hạn' })
        .in('vehicle_package_id', vpIds);

    // 3. Xóa liên kết active_vehicle_package_id trên các thẻ tương ứng
    await supabase
        .from('card')
        .update({ active_vehicle_package_id: null })
        .in('active_vehicle_package_id', vpIds);

    console.log(`[ExpiryJob] Đã expire ${expiredVps.length} gói vé tháng.`);
    return { expired: expiredVps.length };
}

// ─────────────────────────────────────────────────────────────
// Helper nội bộ
// ─────────────────────────────────────────────────────────────
function addOneDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}
