const supabase = require('../config/supabaseClient'); // Thư viện Supabase của bạn
const ekycService = require('./ekycService');

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

        // BƯỚC 1: Gọi sang dịch vụ VNPT eKYC bóc tách giấy tờ trước khi tác động DB
        const ekycResult = await ekycService.extractIdentity(img_front_base64, img_back_base64);

        let isVerified = false;
        let cccdNumber = customer_info.cccd_number;
        let fullName = customer_info.full_name;

        if (ekycResult.success) {
            isVerified = true;
            cccdNumber = ekycResult.data.id;   // Lấy số định danh thật từ VNPT
            fullName = ekycResult.data.name;   // Lấy họ tên thật từ VNPT
        } else {
            throw new Error("Xác thực eKYC VNPT thất bại. Quy trình đăng ký bị từ chối.");
        }

        // BƯỚC 2: Thao tác tuần tự vào Database Supabase
        // 2.1. Khởi tạo Customer
        const { data: customer, error: cError } = await supabase
            .from('customer')
            .insert([{
                full_name: fullName,
                phone: customer_info.phone,
                email: customer_info.email,
                status: 'Hoạt động',
                is_verified: isVerified
            }])
            .select().single();
        if (cError) throw new Error("Lỗi tạo Customer: " + cError.message);

        // 2.2. Ghi nhận log vào bảng customer_kyc
        const { error: kycError } = await supabase
            .from('customer_kyc')
            .insert([{
                customer_id: customer.customer_id,
                cccd_number: cccdNumber,
                ekyc_status: 'VERIFIED',
                verified_at: new Date().toISOString()
            }]);
        if (kycError) throw new Error("Lỗi lưu log KYC: " + kycError.message);

        // 2.3. Tạo Vehicle (Xe) liên kết với Customer
        const { data: vehicle, error: vError } = await supabase
            .from('vehicle')
            .insert([{
                customer_id: customer.customer_id,
                vehicle_type_id: vehicle_info.vehicle_type_id,
                plate_number: vehicle_info.plate_number,
                brand: vehicle_info.brand,
                color: vehicle_info.color,
                status: 'Hoạt động'
            }])
            .select().single();
        if (vError) throw new Error("Lỗi tạo phương tiện: " + vError.message);

        // 2.4. Đăng ký gói tháng (Vehicle Package)
        // Lấy thông tin duration_month từ bảng package để tính end_date
        const { data: pkg, error: pFetchError } = await supabase
            .from('package')
            .select('duration_month')
            .eq('package_id', package_id)
            .single();
        if (pFetchError || !pkg) throw new Error("Không tìm thấy gói cước đã chọn.");

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + pkg.duration_month);

        const { data: vehiclePackage, error: vpError } = await supabase
            .from('vehicle_package')
            .insert([{
                vehicle_id: vehicle.vehicle_id,
                package_id: package_id,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                status: 'ACTIVE'
            }])
            .select().single();
        if (vpError) throw new Error("Lỗi gán gói cước cho xe: " + vpError.message);

        // 2.5. Kiểm tra và Kích hoạt thẻ RFID (Card & Card Registrations)
        const { data: card, error: cardError } = await supabase
            .from('card')
            .select('card_id')
            .eq('code', card_code)
            .single();

        if (cardError || !card) throw new Error("Mã thẻ RFID không tồn tại trong kho hệ thống.");

        // Cập nhật trạng thái thẻ sang hoạt động
        await supabase.from('card').update({ status: 'Hoạt động' }).eq('card_id', card.card_id);

        // Tạo liên kết Thẻ - Xe trong bảng card_registrations
        const { data: registration, error: regError } = await supabase
            .from('card_registrations')
            .insert([{
                card_id: card.card_id,
                vehicle_id: vehicle.vehicle_id,
                status: 'Hoạt Động'
            }])
            .select().single();
        if (regError) throw new Error("Lỗi liên kết thẻ với xe: " + regError.message);

        // MÔ PHỎNG HOÀN TẤT THANH TOÁN TẠI QUẦY
        // (Nếu cần tạo hóa đơn, bạn có thể insert thêm vào bảng payment dựa trên thông tin ở đây)

        return {
            customer_id: customer.customer_id,
            full_name: customer.full_name,
            plate_number: vehicle.plate_number,
            package_end_date: vehiclePackage.end_date,
            card_code: card_code
        };
    }
}

module.exports = new ParkingRegistrationService();