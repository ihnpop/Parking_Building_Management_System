import * as ekycService from './ekycService.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as vnpayService from './vnpayService.js';
import * as repo from '../repositories/parkingRegistrationRepository.js';
import { config } from '../config/config.js';

// Ánh xạ mã nội bộ → nhãn tiếng Việt theo ràng buộc DB (payment_method_check)
// DB constraint: CHECK (payment_method IN ('Tiền mặt', 'VNPay'))
function mapPaymentMethod(method) {
    if (!method) return null;
    const m = method.toLowerCase();
    if (m === 'cash') return 'Tiền mặt';
    if (m === 'vnpay') return 'VNPay';
    return method;
}

// Lấy thông tin gói cước (duration + price): hỗ trợ cả static ID lẫn DB ID
async function resolvePackageInfo(package_id) {
    if (String(package_id).startsWith('static-')) {
        const parts = package_id.split('-');
        const pIdx = parseInt(parts[2], 10);
        const durations = [1, 3, 6];
        const durationMonth = durations[pIdx] || 1;
        // Thử tìm gói cước từ DB theo duration_month
        try {
            const dbPkgs = await repo.findPackageByDuration ? repo.findPackageByDuration(durationMonth) : null;
            if (dbPkgs && dbPkgs.price) {
                return { durationMonth, price: Number(dbPkgs.price) };
            }
        } catch (e) { /* ignore */ }
        return { durationMonth, price: 0 };
    }
    const pkg = await repo.findPackageById(package_id);
    return { durationMonth: pkg?.duration_month || 1, price: Number(pkg?.price) || 0 };
}

// Lấy thông tin gói cho initiateRegistration
async function resolvePackageInfoForInitiate(package_id) {
    if (String(package_id).startsWith('static-')) {
        const parts = package_id.split('-');
        const pIdx = parseInt(parts[2], 10);
        const durations = [1, 3, 6];
        const durationMonth = durations[pIdx] || 1;
        try {
            const pkgInfo = await resolvePackageInfo(package_id);
            if (pkgInfo.price > 0) {
                return { durationMonth, packagePrice: pkgInfo.price };
            }
        } catch (e) { /* ignore */ }
        return { durationMonth, packagePrice: 0 };
    }
    const pkg = await repo.findPackageById(package_id);
    return { durationMonth: pkg?.duration_month || 1, packagePrice: Number(pkg?.price) || 0 };
}

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
        const customer = await repo.createCustomer({
            full_name: fullName,
            phone: phone,
            email: email,
            status: 'Hoạt động'
        });

        // 2.2. Ghi nhận log vào bảng customer_kyc
        await repo.createCustomerKyc({
            customer_id: customer.customer_id,
            cccd_number: cccdNumber,
            ekyc_status: 'Đã xác thực',
            verified_at: new Date().toISOString()
        });

        // 2.3. Tạo Vehicle (Xe) liên kết với Customer
        const rawPlate = (vehicle_info.plate_number || '').replace(/[\s\.\-]/g, '').toUpperCase();
        const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
        if (!rawPlate) {
            throw new Error("Biển số xe không được để trống.");
        }
        if (!plateRegex.test(rawPlate)) {
            throw new Error("Biển số xe không đúng định dạng. Vui lòng nhập theo định dạng xx[A-Z]xxxx hoặc xx[A-Z]xxxxx (Ví dụ: 30K12345 hoặc 59X312345).");
        }

        const vehicle = await repo.createVehicle({
            customer_id: customer.customer_id,
            vehicle_type_id: vehicle_info.vehicle_type_id,
            plate_number: rawPlate,
            brand: vehicle_info.brand || null,
            color: vehicle_info.color || null,
            status: 'Hoạt động'
        });

        // 2.4. Đăng ký gói tháng (Vehicle Package)
        const { durationMonth, price } = await resolvePackageInfo(package_id);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + durationMonth);

        const vehiclePackage = await repo.createVehiclePackage({
            vehicle_id: vehicle.vehicle_id,
            package_id: String(package_id).startsWith('static-') ? null : package_id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'Hoạt động'
        });

        // Tạo payment record cho đăng ký mới (MONTHLY_NEW)
        if (vehiclePackage) {
            try {
                const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
                const dupPayment = await repo.findDuplicatePayment({
                    vehiclePackageId: vehiclePackage.vehicle_package_id,
                    paymentType: 'Đăng ký thẻ tháng',
                    sinceTime: oneMinuteAgo
                });

                if (!dupPayment) {
                    await repo.createPaymentRecord({
                        vehicle_package_id: vehiclePackage.vehicle_package_id,
                        amount: price,
                        payment_method: 'Tiền mặt', // Đăng ký online (legacy flow) mặc định tiền mặt
                        status: 'Đã thanh toán',
                        payment_time: new Date().toISOString(),
                        payment_type: 'Đăng ký thẻ tháng'
                    });
                }
            } catch (payEx) {
                console.error("Exception insert payment khi đăng ký online:", payEx);
            }
        }

        // 2.5. Kiểm tra và Kích hoạt thẻ RFID (Card & Card Registrations)
        let cardId = null;
        const existingCard = await repo.findCardByCode(card_code);

        const expiredDateStr = endDate.toISOString().split('T')[0];

        if (!existingCard) {
            // Trường hợp 2: sinh mã thẻ tháng mới
            // Kiểm tra xem đã vượt quá 50 thẻ tháng chưa
            const count = await repo.countActiveMonthCards();
            if (count >= config.maxMonthCards) {
                throw new Error(`Hệ thống đã đạt giới hạn tối đa ${config.maxMonthCards} thẻ tháng (full slot đăng ký). Không thể tạo thẻ mới.`);
            }

            // Tạo thẻ mới
            const newCard = await repo.createCard({
                code: card_code,
                type: 'Thẻ tháng',
                status: 'Hoạt động',
                expired_date: expiredDateStr
            });
            cardId = newCard.card_id;
        } else {
            // Trường hợp 1: sử dụng thẻ đang chờ
            // Cập nhật trạng thái thẻ sang hoạt động
            await repo.activateCard(existingCard.card_id, {
                status: 'Hoạt động',
                expired_date: expiredDateStr,
                created_at: new Date().toISOString()
            });
            cardId = existingCard.card_id;
        }

        // Tạo liên kết Thẻ - Xe trong bảng card_registrations
        await repo.createCardRegistration({
            card_id: cardId,
            vehicle_id: vehicle.vehicle_id,
            status: 'Hoạt động'
        });

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
            ip_addr,
            created_by,
            origin
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
        const { durationMonth, packagePrice } = await resolvePackageInfoForInitiate(package_id);

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
                payment_type: 'Đăng ký thẻ tháng',
                amount: packagePrice,
                order_code: orderCode,
                status: 'Chờ thanh toán',
                payment_method: mapPaymentMethod(payment_method),
                payment_time: new Date().toISOString(),
                note: savedPayload,
                created_by: created_by || null
            });

            if (payment_method === 'vnpay') {
                payUrl = vnpayService.createPaymentUrl({
                    orderCode,
                    amount: packagePrice,
                    orderInfo: `Dang ky ve thang ${rawPlate}`,
                    ipAddr: ipAddrClean,
                    origin
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
        if (payment.payment_method !== 'Tiền mặt') throw new Error('Giao dịch không phải thanh toán tiền mặt.');
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

            // note là jsonb — Supabase trả về object trực tiếp, không cần JSON.parse()
            registrationData = paymentRecord.note;
            if (!registrationData || typeof registrationData !== 'object') {
                throw new Error('Dữ liệu lưu trữ giao dịch không hợp lệ.');
            }
        } else {
            throw new Error('Phương thức thanh toán không hợp lệ.');
        }

        const { customer_info: cInfo, vehicle_info: vInfo, package_id: pkgId } = registrationData;

        // 2. Kiểm tra giới hạn số lượng thẻ tháng (tối đa 50) + thẻ đã tồn tại chưa
        const count = await repo.countActiveMonthCards();
        const existingCard = await repo.findCardByCode(card_code);

        if (existingCard && existingCard.status === 'Hoạt động') {
            throw new Error(`Mã thẻ RFID ${card_code} đã tồn tại và đang hoạt động trong hệ thống.`);
        }
        if (!existingCard && count >= config.maxMonthCards) {
            throw new Error(`Hệ thống đã đạt giới hạn tối đa ${config.maxMonthCards} thẻ tháng.`);
        }

        // 3. Tính toán thời hạn của gói
        const { durationMonth, packagePrice } = await resolvePackageInfoForInitiate(pkgId);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + durationMonth);
        const expiredDateStr = endDate.toISOString().split('T')[0];

        // --- Bắt đầu ghi toàn bộ dữ liệu xuống database ---

        // 4. Tạo hoặc tìm Customer
        let customer = null;
        const phone = (cInfo.phone || '').trim();
        const email = (cInfo.email || '').trim().toLowerCase();

        const existingCust = await repo.findCustomerByPhone(phone);
        if (existingCust) {
            customer = existingCust;
            await repo.updateCustomer(customer.customer_id, { full_name: cInfo.full_name, email });
        } else {
            customer = await repo.createCustomer({
                full_name: cInfo.full_name,
                phone,
                email,
                status: 'Hoạt động'
            });
        }

        // 5. Ghi log KYC
        await repo.createCustomerKyc({
            customer_id: customer.customer_id,
            cccd_number: cInfo.cccd_number || '',
            ekyc_status: 'Đã xác thực',
            verified_at: new Date().toISOString()
        });

        // 6. Tạo hoặc cập nhật Vehicle
        const rawPlate = (vInfo.plate_number || '').replace(/[\s.\-]/g, '').toUpperCase();
        const existingVeh = await repo.findVehicleByPlate(rawPlate);

        let vehicle = null;
        if (existingVeh) {
            vehicle = existingVeh;
            if (vehicle.customer_id !== customer.customer_id) {
                await repo.updateVehicleCustomer(vehicle.vehicle_id, customer.customer_id);
            }
        } else {
            vehicle = await repo.createVehicle({
                customer_id: customer.customer_id,
                vehicle_type_id: vInfo.vehicle_type_id,
                plate_number: rawPlate,
                brand: vInfo.brand || null,
                color: vInfo.color || null,
                status: 'Hoạt động'
            });
        }

        // 7. Tạo Gói tháng (vehicle_package) với trạng thái 'Hoạt động'
        const vehiclePackage = await repo.createVehiclePackage({
            vehicle_id: vehicle.vehicle_id,
            package_id: String(pkgId).startsWith('static-') ? null : pkgId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: expiredDateStr,
            status: 'Hoạt động'
        });

        // 8. Tạo/Cập nhật thẻ RFID
        let cardId = null;
        if (!existingCard) {
            const newCard = await repo.createCard({
                code: card_code,
                type: 'Thẻ tháng',
                status: 'Hoạt động',
                expired_date: expiredDateStr
            });
            cardId = newCard.card_id;
        } else {
            await repo.activateCard(existingCard.card_id, {
                status: 'Hoạt động',
                expired_date: expiredDateStr,
                created_at: new Date().toISOString()
            });
            cardId = existingCard.card_id;
        }

        // 9. Tạo liên kết Thẻ - Xe (card_registrations)
        await repo.createCardRegistration({
            card_id: cardId,
            vehicle_id: vehicle.vehicle_id,
            status: 'Hoạt động'
        });

        // 10. Xử lý bản ghi thanh toán (Payment)
        if (paymentRecord) {
            // Liên kết payment record với vehicle_package_id mới tạo
            await repo.linkPaymentToVehiclePackage(paymentRecord.payment_id, vehiclePackage.vehicle_package_id);
        }

        // 11. Ghi log hoạt động thẻ
        await repo.createActivityLog({
            card_id: cardId,
            action: 'Cấp mới',
            plate_number: rawPlate,
            customer_name: cInfo.full_name,
            duration_months: durationMonth,
            amount: packagePrice,
            expired_date_after: expiredDateStr,
            note: payment_method === 'vnpay'
                ? `Cấp mới qua cổng VNPay - Đơn: ${orderCode}`
                : `Cấp mới thu tiền mặt - Đơn: ${orderCode}`,
            performed_at: new Date().toISOString()
        });

        return { card_code, vehicle_package_id: vehiclePackage.vehicle_package_id, expired_date: expiredDateStr };
    }

    async getPendingRegistration(userId) {
        if (!userId) return null;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        return await repo.findPendingRegistration(userId, fifteenMinutesAgo);
    }
}

export default new ParkingRegistrationService();

