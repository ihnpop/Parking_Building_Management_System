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
    // GIAI ĐOẠN 1: Tạo dữ liệu nền (Customer, Vehicle, Package) + VNPay
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

        // 1. Tạo Customer
        const { data: customer, error: cError } = await supabase
            .from('customer')
            .insert([{ full_name: customer_info.full_name, phone, email, status: 'Hoạt động' }])
            .select().single();
        if (cError) throw new Error('Lỗi tạo Customer: ' + cError.message);

        // 2. Ghi log KYC (đánh dấu đã xác thực ở bước 1 eKYC)
        const { error: kycError } = await supabase
            .from('customer_kyc')
            .insert([{
                customer_id: customer.customer_id,
                cccd_number: customer_info.cccd_number || '',
                ekyc_status: 'Đã xác thực',
                verified_at: new Date().toISOString()
            }]);
        if (kycError) throw new Error('Lỗi lưu log KYC: ' + kycError.message);

        // 3. Tạo Vehicle
        const rawPlate = (vehicle_info.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase();
        const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
        if (!rawPlate) throw new Error('Biển số xe không được để trống.');
        if (!plateRegex.test(rawPlate)) throw new Error('Biển số xe không đúng định dạng.');

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
        if (vError) throw new Error('Lỗi tạo phương tiện: ' + vError.message);

        // 4. Tạo Vehicle Package
        let durationMonth = 1;
        let packagePrice = 0;
        if (String(package_id).startsWith('static-')) {
            const parts = package_id.split('-');
            const pIdx = parseInt(parts[2], 10);
            const durations = [1, 3, 6];
            durationMonth = durations[pIdx] || 1;
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

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + durationMonth);

        const { data: vehiclePackage, error: vpError } = await supabase
            .from('vehicle_package')
            .insert([{
                vehicle_id: vehicle.vehicle_id,
                package_id: String(package_id).startsWith('static-') ? null : package_id,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                status: 'Chờ kích hoạt'   // Trạng thái chờ - chỉ kích hoạt sau khi cấp RFID
            }])
            .select().single();
        if (vpError) throw new Error('Lỗi gán gói cước cho xe: ' + vpError.message);

        // 5. Tạo giao dịch VNPay (nếu chọn VNPay)
        let payUrl = null;
        let orderCode = null;

        if (payment_method === 'vnpay') {
            const ipAddrClean = ip_addr || '127.0.0.1';
            orderCode = `PK${Date.now()}`;
            await paymentRepository.create({
                vehicle_package_id: vehiclePackage.vehicle_package_id,
                payment_type: 'Đăng ký vé tháng',
                amount: packagePrice,
                order_code: orderCode,
                status: 'Chờ thanh toán'
            });
            payUrl = vnpayService.createPaymentUrl({
                orderCode,
                amount: packagePrice,
                orderInfo: `Dang ky ve thang ${rawPlate}`,
                ipAddr: ipAddrClean
            });
        }

        return {
            vehiclePackageId: vehiclePackage.vehicle_package_id,
            customerId: customer.customer_id,
            vehicleId: vehicle.vehicle_id,
            endDate: endDate.toISOString().split('T')[0],
            payUrl,
            orderCode,
            payment_method
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GIAI ĐOẠN 2: Cấp thẻ RFID + Kích hoạt gói tháng
    // Được gọi ở Bước 5 (Cấp RFID) sau khi thanh toán thành công
    // ─────────────────────────────────────────────────────────────────────────
    async finalizeRegistration(payload) {
        const { vehiclePackageId, card_code, payment_method, orderCode } = payload;

        // Nếu thanh toán VNPay: kiểm tra trạng thái thanh toán
        if (payment_method === 'vnpay' && orderCode) {
            const payment = await paymentRepository.findByOrderCode(orderCode);
            if (!payment || payment.status !== 'Đã thanh toán') {
                throw new Error('Giao dịch VNPay chưa được xác nhận thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
            }
        }

        // Lấy thông tin vehicle_package để biết end_date và vehicle_id
        const { data: vPkg, error: vpFetchErr } = await supabase
            .from('vehicle_package')
            .select('vehicle_id, end_date')
            .eq('vehicle_package_id', vehiclePackageId)
            .single();
        if (vpFetchErr || !vPkg) throw new Error('Không tìm thấy bản ghi gói tháng.');

        const expiredDateStr = vPkg.end_date;

        // Kích hoạt vehicle_package
        const { error: activateErr } = await supabase
            .from('vehicle_package')
            .update({ status: 'Hoạt động' })
            .eq('vehicle_package_id', vehiclePackageId);
        if (activateErr) throw new Error('Lỗi kích hoạt gói tháng: ' + activateErr.message);

        // Kiểm tra và tạo/kích hoạt thẻ RFID
        let cardId = null;
        const { data: existingCard, error: cardError } = await supabase
            .from('card')
            .select('card_id, status')
            .eq('code', card_code)
            .maybeSingle();
        if (cardError) throw new Error('Lỗi kiểm tra thẻ RFID: ' + cardError.message);

        if (!existingCard) {
            // Kiểm tra giới hạn 50 thẻ
            const { count, error: countErr } = await supabase
                .from('card')
                .select('card_id', { count: 'exact', head: true })
                .eq('type', 'Thẻ tháng')
                .not('status', 'eq', 'Đã xóa');
            if (countErr) throw new Error('Lỗi đếm số lượng thẻ: ' + countErr.message);
            if (count >= 50) throw new Error('Hệ thống đã đạt giới hạn tối đa 50 thẻ tháng.');

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

        // Tạo liên kết Thẻ - Xe
        const { error: regError } = await supabase
            .from('card_registrations')
            .insert([{ card_id: cardId, vehicle_id: vPkg.vehicle_id, status: 'Hoạt động' }]);
        if (regError) throw new Error('Lỗi liên kết thẻ với xe: ' + regError.message);

        return { card_code, vehicle_package_id: vehiclePackageId, expired_date: expiredDateStr };
    }
}

export default new ParkingRegistrationService();