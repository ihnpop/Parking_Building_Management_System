import supabase from '../config/supabaseClient.js';
import * as ekycService from './ekycService.js';

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
                status: 'ACTIVE'
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
    }
}

export default new ParkingRegistrationService();