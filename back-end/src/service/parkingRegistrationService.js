import supabase from '../config/supabaseClient.js';
import * as ekycService from './ekycService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as vnpayService from './vnpayService.js';

class ParkingRegistrationService {
    async processFullMonthlyRegistration(payload) {
        const {
            customer_info,
            img_front_base64,
            img_back_base64,
            vehicle_info,
            package_id,
            card_code
        } = payload;
        // Kiểm tra dữ liệu khách hàng trước khi gọi eKYC
        const phone = (customer_info.phone || '').trim();
        const email = (customer_info.email || '').trim().toLowerCase();

        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // Kiểm tra định dạng số điện thoại Việt Nam
        if (!phoneRegex.test(phone)) {
            throw new Error('Số điện thoại không hợp lệ.');
        }
        // Kiểm tra định dạng email
        if (!emailRegex.test(email)) {
            throw new Error('Email không hợp lệ.');
        }

        console.log("eKYC: Đang xác thực giấy tờ cho khách hàng:", customer_info.full_name);

        // BƯỚC 1: Gọi sang dịch vụ VNPT eKYC bóc tách giấy tờ trước khi tác động DB
        const ekycResult = await ekycService.extractIdentity(img_front_base64, img_back_base64);

        let isVerified = false;
        let cccdNumber = customer_info.cccd_number || '';
        let fullName = customer_info.full_name || '';

        if (ekycResult.success) {
            isVerified = true;
            const ocr = ekycResult.ocrData || {};
            cccdNumber = ocr.id || ocr.id_card_number || cccdNumber;   // Lấy số định danh thật từ VNPT
            fullName = ocr.name || ocr.full_name || fullName;   // Lấy họ tên thật từ VNPT
            console.log(`eKYC: Xác thực thành công. Họ tên: ${fullName}, Số CCCD: ${cccdNumber}`);
        } else {
            console.error("eKYC: Xác thực thất bại:", ekycResult.message);
            throw new Error(`Xác thực eKYC VNPT thất bại: ${ekycResult.message || 'Giấy tờ không hợp lệ'}`);
        }

        // BƯỚC 2: Thao tác tuần tự vào Database Supabase
        // 2.1. Khởi tạo Customer
        const { data: customer, error: cError } = await supabase
            .from('customer')
            .insert([{
                full_name: fullName,
                phone: phone,
                email: email,
                status: 'Hoạt động'
            }])
            .select().single();
        if (cError) throw new Error("Lỗi tạo Customer: " + cError.message);

        // 2.2. Ghi nhận log vào bảng customer_kyc
        const { error: kycError } = await supabase
            .from('customer_kyc')
            .insert([{
                customer_id: customer.customer_id,
                cccd_number: cccdNumber,
                ekyc_status: 'Đã xác thực',
                verified_at: new Date().toISOString()
            }]);
        if (kycError) throw new Error("Lỗi lưu log KYC: " + kycError.message);

        // 2.3. Tạo Vehicle (Xe) liên kết với Customer
        const rawPlate = (vehicle_info.plate_number || '').replace(/[\s\.\-]/g, '').toUpperCase();
        const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
        if (!rawPlate) {
            throw new Error("Biển số xe không được để trống.");
        }
        if (!plateRegex.test(rawPlate)) {
            throw new Error("Biển số xe không đúng định dạng. Vui lòng nhập theo định dạng xx[A-Z]xxxx hoặc xx[A-Z]xxxxx (Ví dụ: 30K12345 hoặc 59X312345).");
        }

        const { data: vehicle, error: vError } = await supabase
            .from('vehicle')
            .insert([{
                customer_id: customer.customer_id,
                vehicle_type_id: vehicle_info.vehicle_type_id,
                plate_number: rawPlate,
                brand: vehicle_info.brand || null,
                color: vehicle_info.color || null,
                status: 'Hoạt động'
            }])
            .select().single();
        if (vError) throw new Error("Lỗi tạo phương tiện: " + vError.message);

        // 2.4. Đăng ký gói tháng (Vehicle Package)
        let durationMonth = 1;
        if (String(package_id).startsWith('static-')) {
            const parts = package_id.split('-');
            const pIdx = parseInt(parts[2], 10);
            const durations = [1, 3, 6];
            durationMonth = durations[pIdx] || 1;
        } else {
            // Lấy thông tin duration_month từ bảng package để tính end_date
            const { data: pkg, error: pFetchError } = await supabase
                .from('package')
                .select('duration_month')
                .eq('package_id', package_id)
                .single();
            if (pFetchError || !pkg) throw new Error("Không tìm thấy gói cước đã chọn.");
            durationMonth = pkg.duration_month;
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + durationMonth);

        const { data: vehiclePackage, error: vpError } = await supabase
            .from('vehicle_package')
            .insert([{
                vehicle_id: vehicle.vehicle_id,
                package_id: String(package_id).startsWith('static-') ? null : package_id, // Nếu dùng static thì để null hoặc gán package ID phù hợp
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                status: 'Hoạt động'
            }])
            .select().single();
        if (vpError) throw new Error("Lỗi gán gói cước cho xe: " + vpError.message);

        // 2.5. Kiểm tra và Kích hoạt thẻ RFID (Card & Card Registrations)
        let cardId = null;
        const { data: existingCard, error: cardError } = await supabase
            .from('card')
            .select('card_id, status')
            .eq('code', card_code)
            .maybeSingle();

        if (cardError) throw new Error("Lỗi kiểm tra thẻ RFID: " + cardError.message);

        const expiredDateStr = endDate.toISOString().split('T')[0];

        if (!existingCard) {
            // Trường hợp 2: sinh mã thẻ tháng mới
            // Kiểm tra xem đã vượt quá 50 thẻ tháng chưa
            const { count, error: countErr } = await supabase
                .from('card')
                .select('card_id', { count: 'exact', head: true })
                .eq('type', 'Thẻ tháng')
                .not('status', 'eq', 'Đã xóa');

            if (countErr) throw new Error("Lỗi đếm số lượng thẻ tháng: " + countErr.message);

            if (count >= 50) {
                throw new Error("Hệ thống đã đạt giới hạn tối đa 50 thẻ tháng (full slot đăng ký). Không thể tạo thẻ mới.");
            }

            // Tạo thẻ mới
            const { data: newCard, error: createCardErr } = await supabase
                .from('card')
                .insert([{
                    code: card_code,
                    type: 'Thẻ tháng',
                    status: 'Hoạt động',
                    expired_date: expiredDateStr
                }])
                .select()
                .single();

            if (createCardErr) throw new Error("Lỗi tạo thẻ tháng mới: " + createCardErr.message);
            cardId = newCard.card_id;
        } else {
            // Trường hợp 1: sử dụng thẻ đang chờ
            // Cập nhật trạng thái thẻ sang hoạt động
            const { error: updateErr } = await supabase.from('card')
                .update({
                    status: 'Hoạt động',
                    expired_date: expiredDateStr,
                    created_at: new Date().toISOString()
                })
                .eq('card_id', existingCard.card_id);

            if (updateErr) throw new Error("Lỗi cập nhật trạng thái thẻ: " + updateErr.message);
            cardId = existingCard.card_id;
        }

        // Tạo liên kết Thẻ - Xe trong bảng card_registrations
        const { data: registration, error: regError } = await supabase
            .from('card_registrations')
            .insert([{
                card_id: cardId,
                vehicle_id: vehicle.vehicle_id,
                status: 'Hoạt động'
            }])
            .select().single();
        if (regError) throw new Error("Lỗi liên kết thẻ với xe: " + regError.message);

        return {
            customer_id: customer.customer_id,
            full_name: customer.full_name,
            plate_number: vehicle.plate_number,
            package_end_date: expiredDateStr,
            card_code: card_code
        };
    }   // end processFullMonthlyRegistration

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 1: Tạo dữ liệu nền (Chỉ lưu vào payment note tạm với VNPay/Cash)
    // Được gọi ở Bước 4 (Xác nhận & Thanh toán)
    // ─────────────────────────────────────────────────────────────────────────
    async initiateRegistration(payload) {
        const {
            customer_info,
            vehicle_info,
            package_id,
            payment_method, // 'vnpay' | 'cash'
            ip_addr
        } = payload;

        const phone = (customer_info.phone || '').trim();
        const email = (customer_info.email || '').trim().toLowerCase();

        const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!phoneRegex.test(phone)) throw new Error('Số điện thoại không hợp lệ.');
        if (!emailRegex.test(email)) throw new Error('Email không hợp lệ.');

        const rawPlate = (vehicle_info.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase();
        const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
        if (!rawPlate) throw new Error('Biển số xe không được để trống.');
        if (!plateRegex.test(rawPlate)) throw new Error('Biển số xe không đúng định dạng.');

        // Tính toán thông tin gói cước
        let durationMonth = 1;
        let packagePrice = 0;
        if (String(package_id).startsWith('static-')) {
            const parts = package_id.split('-');
            const pIdx = parseInt(parts[2], 10);
            const durations = [1, 3, 6];
            durationMonth = durations[pIdx] || 1;
            packagePrice = durationMonth * 100000;
        } else {
            const { data: pkg, error: pFetchError } = await supabase
                .from('package')
                .select('duration_month, price')
                .eq('package_id', package_id)
                .single();
            if (pFetchError || !pkg) throw new Error('Không tìm thấy gói cước đã chọn.');
            durationMonth = pkg.duration_month;
            packagePrice = Number(pkg.price) || 0;
        }

        let payUrl = null;
        let orderCode = null;

        if (payment_method === 'vnpay' || payment_method === 'cash') {
            const ipAddrClean = ip_addr || '127.0.0.1';
            orderCode = payment_method === 'vnpay' ? `PK${Date.now()}` : `PK_CASH_${Date.now()}`;
            
            const savedPayload = {
                customer_info: {
                    full_name: customer_info.full_name,
                    phone: phone,
                    email: email,
                    cccd_number: customer_info.cccd_number || ''
                },
                vehicle_info: {
                    vehicle_type_id: vehicle_info.vehicle_type_id,
                    plate_number: rawPlate,
                    brand: vehicle_info.brand || null,
                    color: vehicle_info.color || null
                },
                package_id,
                durationMonth,
                packagePrice
            };

            await paymentRepository.create({
                vehicle_package_id: null,
                payment_type: 'Đăng ký vé tháng',
                amount: packagePrice,
                order_code: orderCode,
                status: 'Chờ thanh toán',
                payment_method: payment_method,
                note: JSON.stringify(savedPayload)
            });

            if (payment_method === 'vnpay') {
                payUrl = vnpayService.createPaymentUrl({
                    orderCode,
                    amount: packagePrice,
                    orderInfo: `Dang ky ve thang ${rawPlate}`,
                    ipAddr: ipAddrClean
                });
            }
        }

        return {
            payUrl,
            orderCode,
            payment_method
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HÀM PHỤ TRỢ: Xác nhận nhận tiền mặt từ khách hàng
    // Cập nhật trạng thái payment từ 'Chờ thanh toán' sang 'Đã thanh toán'
    // ─────────────────────────────────────────────────────────────────────────
    async confirmCashPayment(orderCode) {
        const payment = await paymentRepository.findByOrderCode(orderCode);
        if (!payment) throw new Error('Không tìm thấy giao dịch.');
        if (payment.payment_method !== 'cash') throw new Error('Giao dịch không phải thanh toán tiền mặt.');
        if (payment.status !== 'Chờ thanh toán') throw new Error('Giao dịch đã được xác nhận hoặc thất bại trước đó.');

        const updated = await paymentRepository.updateStatus(orderCode, {
            status: 'Đã thanh toán',
            paid_at: new Date().toISOString(),
        });
        return updated;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 2: Cấp thẻ RFID + Ghi nhận toàn bộ dữ liệu xuống database
    // Được gọi ở Bước 5 (Cấp RFID) sau khi thanh toán thành công (VNPay hoặc Cash)
    // ─────────────────────────────────────────────────────────────────────────
    async finalizeRegistration(payload) {
        const { card_code, payment_method, orderCode } = payload;

        let registrationData = null;
        let paymentRecord = null;

        // 1. Nhận thông tin đăng ký dựa trên phương thức thanh toán
        if (payment_method === 'vnpay' || payment_method === 'cash') {
            if (!orderCode) {
                throw new Error('Thiếu mã đơn hàng.');
            }
            paymentRecord = await paymentRepository.findByOrderCode(orderCode);
            if (!paymentRecord) {
                throw new Error('Không tìm thấy giao dịch tương ứng.');
            }
            if (paymentRecord.status !== 'Đã thanh toán') {
                throw new Error('Giao dịch chưa được xác nhận thanh toán. Vui lòng hoàn tất thanh toán rồi thử lại.');
            }

            try {
                registrationData = JSON.parse(paymentRecord.note);
            } catch (e) {
                throw new Error('Dữ liệu lưu trữ giao dịch không hợp lệ.');
            }
        } else {
            throw new Error('Phương thức thanh toán không hợp lệ.');
        }

        const { customer_info: cInfo, vehicle_info: vInfo, package_id: pkgId } = registrationData;

        // 2. Kiểm tra giới hạn số lượng thẻ tháng (tối đa 50)
        const { count, error: countErr } = await supabase
            .from('card')
            .select('card_id', { count: 'exact', head: true })
            .eq('type', 'Thẻ tháng')
            .not('status', 'eq', 'Đã xóa');
        if (countErr) throw new Error('Lỗi kiểm tra giới hạn thẻ: ' + countErr.message);

        // Kiểm tra xem thẻ này đã tồn tại hay chưa
        const { data: existingCard, error: cardError } = await supabase
            .from('card')
            .select('card_id, code, status')
            .eq('code', card_code)
            .maybeSingle();
        if (cardError) throw new Error('Lỗi kiểm tra thẻ RFID: ' + cardError.message);

        if (existingCard && existingCard.status === 'Hoạt động') {
            throw new Error(`Mã thẻ RFID ${card_code} đã tồn tại và đang hoạt động trong hệ thống.`);
        }

        if (!existingCard && count >= 50) {
            throw new Error('Hệ thống đã đạt giới hạn tối đa 50 thẻ tháng.');
        }

        // 3. Tính toán thời hạn của gói
        let durationMonth = 1;
        let packagePrice = 0;
        if (String(pkgId).startsWith('static-')) {
            const parts = pkgId.split('-');
            const pIdx = parseInt(parts[2], 10);
            const durations = [1, 3, 6];
            durationMonth = durations[pIdx] || 1;
            packagePrice = durationMonth * 100000;
        } else {
            const { data: pkg, error: pFetchError } = await supabase
                .from('package')
                .select('duration_month, price')
                .eq('package_id', pkgId)
                .single();
            if (pFetchError || !pkg) throw new Error('Không tìm thấy gói cước.');
            durationMonth = pkg.duration_month;
            packagePrice = Number(pkg.price) || 0;
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + durationMonth);
        const expiredDateStr = endDate.toISOString().split('T')[0];

        // --- Bắt đầu ghi toàn bộ dữ liệu xuống database ---

        // 4. Tạo hoặc tìm Customer
        let customer = null;
        const phone = (cInfo.phone || '').trim();
        const email = (cInfo.email || '').trim().toLowerCase();

        const { data: existingCust, error: custFetchErr } = await supabase
            .from('customer')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (custFetchErr) throw new Error('Lỗi tìm kiếm khách hàng: ' + custFetchErr.message);

        if (existingCust) {
            customer = existingCust;
            await supabase
                .from('customer')
                .update({ full_name: cInfo.full_name, email })
                .eq('customer_id', customer.customer_id);
        } else {
            const { data: newCust, error: cError } = await supabase
                .from('customer')
                .insert([{ full_name: cInfo.full_name, phone, email, status: 'Hoạt động' }])
                .select().single();
            if (cError) throw new Error('Lỗi tạo Customer: ' + cError.message);
            customer = newCust;
        }

        // 5. Ghi log KYC
        const { error: kycError } = await supabase
            .from('customer_kyc')
            .insert([{
                customer_id: customer.customer_id,
                cccd_number: cInfo.cccd_number || '',
                ekyc_status: 'Đã xác thực',
                verified_at: new Date().toISOString()
            }]);
        if (kycError) throw new Error('Lỗi lưu log KYC: ' + kycError.message);

        // 6. Tạo hoặc cập nhật Vehicle
        const rawPlate = (vInfo.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase();
        const { data: existingVeh, error: vehFetchErr } = await supabase
            .from('vehicle')
            .select('vehicle_id, customer_id')
            .eq('plate_number', rawPlate)
            .maybeSingle();
        if (vehFetchErr) throw new Error('Lỗi truy vấn xe: ' + vehFetchErr.message);

        let vehicle = null;
        if (existingVeh) {
            vehicle = existingVeh;
            if (vehicle.customer_id !== customer.customer_id) {
                await supabase
                    .from('vehicle')
                    .update({ customer_id: customer.customer_id })
                    .eq('vehicle_id', vehicle.vehicle_id);
            }
        } else {
            const { data: newVeh, error: vError } = await supabase
                .from('vehicle')
                .insert([{
                    customer_id: customer.customer_id,
                    vehicle_type_id: vInfo.vehicle_type_id,
                    plate_number: rawPlate,
                    brand: vInfo.brand || null,
                    color: vInfo.color || null,
                    status: 'Hoạt động'
                }])
                .select().single();
            if (vError) throw new Error('Lỗi tạo phương tiện: ' + vError.message);
            vehicle = newVeh;
        }

        // 7. Tạo Gói tháng (vehicle_package) với trạng thái 'Hoạt động'
        const { data: vehiclePackage, error: vpError } = await supabase
            .from('vehicle_package')
            .insert([{
                vehicle_id: vehicle.vehicle_id,
                package_id: String(pkgId).startsWith('static-') ? null : pkgId,
                start_date: startDate.toISOString().split('T')[0],
                end_date: expiredDateStr,
                status: 'Hoạt động'
            }])
            .select().single();
        if (vpError) throw new Error('Lỗi gán gói cước cho xe: ' + vpError.message);

        // 8. Tạo/Cập nhật thẻ RFID
        let cardId = null;
        if (!existingCard) {
            const { data: newCard, error: createCardErr } = await supabase
                .from('card')
                .insert([{ code: card_code, type: 'Thẻ tháng', status: 'Hoạt động', expired_date: expiredDateStr }])
                .select().single();
            if (createCardErr) throw new Error('Lỗi tạo thẻ RFID mới: ' + createCardErr.message);
            cardId = newCard.card_id;
        } else {
            const { error: updateErr } = await supabase.from('card')
                .update({ status: 'Hoạt động', expired_date: expiredDateStr, created_at: new Date().toISOString() })
                .eq('card_id', existingCard.card_id);
            if (updateErr) throw new Error('Lỗi cập nhật thẻ RFID: ' + updateErr.message);
            cardId = existingCard.card_id;
        }

        // 9. Tạo liên kết Thẻ - Xe (card_registrations)
        const { error: regError } = await supabase
            .from('card_registrations')
            .insert([{ card_id: cardId, vehicle_id: vehicle.vehicle_id, status: 'Hoạt động' }]);
        if (regError) throw new Error('Lỗi liên kết thẻ với xe: ' + regError.message);

        // 10. Xử lý bản ghi thanh toán (Payment)
        if (paymentRecord) {
            // Liên kết payment record với vehicle_package_id mới tạo
            const { error: paymentUpdateErr } = await supabase
                .from('payment')
                .update({ vehicle_package_id: vehiclePackage.vehicle_package_id })
                .eq('payment_id', paymentRecord.payment_id);
            if (paymentUpdateErr) throw new Error('Lỗi liên kết hóa đơn thanh toán: ' + paymentUpdateErr.message);
        }

        // 11. Ghi log hoạt động thẻ
        const { error: logErr } = await supabase
            .from('card_activity_logs')
            .insert([{
                card_id: cardId,
                action: 'Cấp mới',
                plate_number: rawPlate,
                customer_name: cInfo.full_name,
                duration_months: durationMonth,
                amount: packagePrice,
                expired_date_after: expiredDateStr,
                note: payment_method === 'vnpay' ? `Cấp mới qua cổng VNPay - Đơn: ${orderCode}` : `Cấp mới thu tiền mặt - Đơn: ${orderCode}`,
                performed_at: new Date().toISOString()
            }]);
        if (logErr) console.warn('Lỗi ghi log hoạt động thẻ (bỏ qua):', logErr.message);

        return { card_code, vehicle_package_id: vehiclePackage.vehicle_package_id, expired_date: expiredDateStr };
    }
}

export default new ParkingRegistrationService();