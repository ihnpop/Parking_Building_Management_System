import * as monthCardRepository from "../repositories/monthCardRepository.js";
import { getCardReissueFee } from "../repositories/lostCardRepository.js";
import { config } from "../config/config.js";

// Bảng giá gói gia hạn (Tra cứu động từ DB)
export const getRenewPackages = async (userId = null) => {
  const packages = await getPackages(userId);
  if (packages && packages.length > 0) {
    return packages.map((p) => ({
      package_id: p.package_id,
      name: p.name,
      months: p.duration_month,
      price: Number(p.price),
      vehicle_type_id: p.vehicle_type_id,
    }));
  }
  return [];
};

// Fallback tương thích ngược (deprecated)
export const RENEW_PACKAGES = [];

/**
 * Kiểm tra định dạng số điện thoại Việt Nam
 * Quy tắc: bắt đầu bằng 0, đủ 10 số, đầu số hợp lệ (03/05/07/08/09)
 * @param {string} phone
 * @returns {boolean}
 */
const isValidVietnamesePhoneNumber = (phone) => {
  const regex = /^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
  return regex.test(phone);
};

/**
 * Kiểm tra định dạng email cơ bản (local@domain.tld)
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Cộng thêm tháng vào ngày cụ thể một cách an toàn (tránh tràn ngày)
 * @param {Date} date 
 * @param {number} months 
 * @returns {Date}
 */
const addMonthsSafely = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
};

/**
 * Thực hiện gia hạn thẻ tháng
 * @param {object} payload 
 * @returns {Promise<object>}
 */
export const renewMonthlyCard = async ({ registrationId, months, note, currentUserId }) => {
  const numMonths = Number(months);
  if (isNaN(numMonths) || numMonths <= 0) {
    throw new Error("Số tháng gia hạn không hợp lệ.");
  }

  // 1. Kiểm tra đăng ký tồn tại
  const registration = await monthCardRepository.findRegistrationWithCard(registrationId);
  if (!registration) {
    throw new Error("Không tìm thấy thông tin đăng ký thẻ.");
  }

  // Tra cứu gói cước động từ DB
  let pkg = null;
  const vehicleTypeId = registration.vehicle?.vehicle_type_id;
  if (vehicleTypeId) {
    const matchedPkg = await monthCardRepository.findActivePackage(vehicleTypeId, numMonths);
    if (matchedPkg) {
      pkg = { months: numMonths, price: Number(matchedPkg.price) };
    }
  }

  if (!pkg) {
    const allPkgs = await monthCardRepository.getActivePackages();
    const matched = allPkgs?.find(p => Number(p.duration_month) === numMonths);
    if (matched) {
      pkg = { months: numMonths, price: Number(matched.price) };
    } else {
      pkg = { months: numMonths, price: 0 };
    }
  }

  const card = registration.card;
  if (!card) {
    throw new Error("Không tìm thấy thẻ liên kết với đăng ký này.");
  }

  // 3. Kiểm tra tính hợp lệ của Thẻ (Card)
  if (card.status === 'Đã xóa' || card.status === 'DELETED') {
    throw new Error("Không thể gia hạn thẻ đã bị xóa.");
  }
  if (card.status === 'Đã khóa' || card.status === 'LOCKED') {
    throw new Error("Không thể gia hạn thẻ đã bị khóa.");
  }
  if (card.type !== 'Thẻ tháng') {
    throw new Error("Chỉ cho phép gia hạn đối với thẻ tháng.");
  }

  // 4. Kiểm tra tính hợp lệ của Đăng ký (Registration)
  const isRegActive = registration.status === 'Hoạt động' || registration.status === 'ACTIVE';
  if (!isRegActive) {
    throw new Error("Liên kết đăng ký thẻ hiện không hoạt động.");
  }

  // 5. Tính toán ngày hết hạn mới (New Expiry Date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let startDate = today;
  const currentExpiryStr = card.expired_date;

  if (currentExpiryStr) {
    const currentExpiry = new Date(currentExpiryStr);
    currentExpiry.setHours(0, 0, 0, 0);
    // Nếu ngày hết hạn cũ lớn hơn hôm nay -> Gia hạn cộng tiếp từ ngày hết hạn cũ
    if (currentExpiry > today) {
      startDate = currentExpiry;
    }
  }

  const newExpiryDateObj = addMonthsSafely(startDate, pkg.months);
  const newExpiryDateStr = newExpiryDateObj.toISOString().split('T')[0];

  // 6. Cập nhật hạn dùng của thẻ tháng (cập nhật table card.expired_date)
  await monthCardRepository.updateCardExpirationDate(card.card_id, newExpiryDateStr);

  // 6.5. Cập nhật hoặc thêm mới vehicle_package cho xe tháng khi gia hạn
  let vehiclePackageId = null;
  try {
    const existingVp = await monthCardRepository.findLatestVehiclePackageByVehicle(registration.vehicle_id);

    if (existingVp) {
      const updatedVp = await monthCardRepository.updateVehiclePackage(existingVp.vehicle_package_id, {
        end_date: newExpiryDateStr,
        status: 'Hoạt động'
      });
      vehiclePackageId = updatedVp.vehicle_package_id;
    } else {
      const newVp = await monthCardRepository.createVehiclePackage({
        vehicle_id: registration.vehicle_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: newExpiryDateStr,
        status: 'Hoạt động'
      });
      vehiclePackageId = newVp.vehicle_package_id;
    }
  } catch (vpEx) {
    console.error("Exception handling vehicle_package on renew:", vpEx);
  }

  // 6.6. Tạo payment record (MONTHLY_RENEW)
  if (vehiclePackageId) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const dupPayment = await monthCardRepository.findDuplicatePayment({
        vehiclePackageId,
        paymentType: 'Gia hạn vé tháng',
        amount: pkg.price,
        sinceTime: oneMinuteAgo
      });

      if (!dupPayment) {
        await monthCardRepository.createPayment({
          vehicle_package_id: vehiclePackageId,
          amount: pkg.price,
          payment_method: 'Tiền mặt',
          status: 'Đã thanh toán',
          payment_time: new Date().toISOString(),
          payment_type: 'Gia hạn vé tháng',
          created_by: currentUserId || null
        });
      }
    } catch (payEx) {
      console.error("Exception insert payment on renew:", payEx);
    }
  }

  // 7. Ghi hoạt động thẻ (insert table card_activity_logs)
  const oldDataLog = {
    expired_date: currentExpiryStr || null
  };

  const newDataLog = {
    expired_date: newExpiryDateStr,
    months: pkg.months,
    price: pkg.price
  };

  const performedBy = currentUserId || null;

  await monthCardRepository.createActivityLog({
    cardId: card.card_id,
    registrationId: registration.registration_id,
    action: 'Gia hạn',
    plateNumber: registration.vehicle?.plate_number || null,
    customerName: registration.vehicle?.customer?.full_name || null,
    durationMonths: pkg.months,
    amount: pkg.price,
    expiredDateBefore: currentExpiryStr || null,
    expiredDateAfter: newExpiryDateStr,
    oldData: oldDataLog,
    newData: newDataLog,
    note: note || `Gia hạn ${pkg.months} tháng`,
    performedBy
  });

  return {
    success: true,
    message: "Gia hạn thẻ tháng thành công.",
    cardCode: card.code,
    newExpiryDate: newExpiryDateStr,
    price: pkg.price
  };
};



/**
 * Tạo mới một thẻ tháng (đăng ký mới)
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createMonthCard = async ({
  plate,
  startDate,
  durationMonths,
  fullName,
  phone,
  email,
  status,
  vehicleTypeId,
  note,
  currentUserId,
  cccdNumber,
  cccd_number
}) => {
  // 1. Validate dữ liệu đầu vào
  if (!plate || !plate.trim()) {
    throw new Error("Thiếu biển số xe.");
  }
  if (!fullName || !fullName.trim()) {
    throw new Error("Thiếu tên khách hàng.");
  }
  if (!durationMonths || Number(durationMonths) <= 0) {
    throw new Error("Thời hạn đăng ký không hợp lệ.");
  }

  const cleanPlate = plate.replace(/[\s\.\-]/g, '').toUpperCase();
  const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
  if (!plateRegex.test(cleanPlate)) {
    throw new Error("Biển số xe không đúng định dạng xx(A-Z)xxxxx hoặc xx(A-Z)xxxx (Ví dụ: 29A12345)");
  }

  // 2. Kiểm tra xe đã có thẻ đang hoạt động chưa
  let vehicle = await monthCardRepository.findVehicleByPlate(cleanPlate);

  if (vehicle) {
    const activeReg = await monthCardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (activeReg) {
      throw new Error(
        `Biển số xe ${cleanPlate} đã có thẻ đang hoạt động (mã thẻ: ${activeReg.card?.code || ""}).`
      );
    }
  }

  // 3. Tìm hoặc tạo khách hàng
  let customerId = null;
  if (phone && phone.trim()) {
    const existingCustomer = await monthCardRepository.findCustomerByPhone(phone.trim());
    if (existingCustomer) {
      customerId = existingCustomer.customer_id;
    }
  }
  if (!customerId) {
    const newCustomer = await monthCardRepository.createCustomer({
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null
    });
    customerId = newCustomer.customer_id;
  }

  const cleanCccd = (cccdNumber || cccd_number || '').trim();
  if (customerId && cleanCccd) {
    await monthCardRepository.insertCustomerKyc(customerId, cleanCccd);
  }

  // 4. Tìm hoặc tạo xe
  if (!vehicle) {
    if (!vehicleTypeId) {
      throw new Error("Thiếu thông tin loại xe (vehicleTypeId).");
    }
    vehicle = await monthCardRepository.createVehicle({
      plate: cleanPlate,
      customerId,
      vehicleTypeId
    });
  } else if (vehicle.customer_id !== customerId) {
    // Xe đã tồn tại nhưng gắn với khách hàng khác -> cập nhật lại chủ xe mới
    await monthCardRepository.updateVehicleCustomerId(vehicle.vehicle_id, customerId);
  }

  // 5. Tính ngày hết hạn
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const expiredDateObj = addMonthsSafely(start, Number(durationMonths));
  const expiredDateStr = expiredDateObj.toISOString().split("T")[0];

  const cardStatus = status || "Hoạt động";
  let card = null;

  // 6. Tìm thẻ tháng có trạng thái 'Đang chờ'
  const pendingCard = await monthCardRepository.findPendingMonthCard();

  let code = "";
  if (pendingCard) {
    // Trường hợp 1: Sử dụng thẻ đang chờ
    code = pendingCard.code;
    card = await monthCardRepository.updateCard(pendingCard.card_id, {
      status: cardStatus,
      expired_date: expiredDateStr,
      created_at: startDate || new Date().toISOString()
    });
  } else {
    // Trường hợp 2: Không còn thẻ đang chờ -> đếm và sinh mã mới
    const count = await monthCardRepository.countActiveMonthCards();

    if (count >= config.maxMonthCards) {
      throw new Error(`Hệ thống đã đạt giới hạn tối đa ${config.maxMonthCards} thẻ tháng (full slot đăng ký).`);
    }

    code = await monthCardRepository.generateNextMonthCode();

    // Tạo thẻ mới
    card = await monthCardRepository.createCard({
      code,
      type: "Thẻ tháng",
      status: cardStatus,
      expiredDate: expiredDateStr
    });
  }

  // 8. Tạo đăng ký thẻ (liên kết thẻ với xe)
  const registration = await monthCardRepository.createRegistration({
    cardId: card.card_id,
    vehicleId: vehicle.vehicle_id,
    status: "Hoạt động"
  });

  // 8.5. Tìm package và tạo vehicle_package
  let packageId = null;
  let price = 0;
  try {
    const duration = Number(durationMonths) || 1;
    const matchedPkg = await monthCardRepository.findActivePackage(vehicleTypeId, duration);

    if (matchedPkg) {
      packageId = matchedPkg.package_id;
      price = Number(matchedPkg.price) || 0;
    } else {
      const fallbackPkg = RENEW_PACKAGES.find(p => p.months === duration);
      price = fallbackPkg ? fallbackPkg.price : 0;
    }
  } catch (pkgErr) {
    console.error("Error finding package for new card:", pkgErr);
    const duration = Number(durationMonths) || 1;
    const fallbackPkg = RENEW_PACKAGES.find(p => p.months === duration);
    price = fallbackPkg ? fallbackPkg.price : 0;
  }

  let vehiclePackageId = null;
  try {
    const newVp = await monthCardRepository.createVehiclePackage({
      vehicle_id: vehicle.vehicle_id,
      package_id: packageId,
      start_date: start.toISOString().split('T')[0],
      end_date: expiredDateStr,
      status: 'Hoạt động'
    });
    vehiclePackageId = newVp.vehicle_package_id;
  } catch (vpEx) {
    console.error("Exception insert vehicle_package:", vpEx);
  }

  // 8.6. Tạo payment record (MONTHLY_NEW)
  if (vehiclePackageId) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const dupPayment = await monthCardRepository.findDuplicatePayment({
        vehiclePackageId,
        paymentType: 'Đăng ký vé tháng',
        sinceTime: oneMinuteAgo
      });

      if (!dupPayment) {
        await monthCardRepository.createPayment({
          vehicle_package_id: vehiclePackageId,
          amount: price,
          payment_method: 'Tiền mặt',
          status: 'Đã thanh toán',
          payment_time: new Date().toISOString(),
          payment_type: 'Đăng ký vé tháng',
          created_by: currentUserId || null
        });
      }
    } catch (payEx) {
      console.error("Exception insert payment:", payEx);
    }
  }

  // 9. Ghi log hoạt động
  await monthCardRepository.createActivityLog({
    cardId: card.card_id,
    registrationId: registration.registration_id,
    action: "Cấp mới",
    plateNumber: cleanPlate,
    customerName: fullName.trim(),
    durationMonths: Number(durationMonths),
    amount: price,
    expiredDateBefore: null,
    expiredDateAfter: expiredDateStr,
    oldData: null,
    newData: {
      code,
      plate: cleanPlate,
      expired_date: expiredDateStr,
      months: Number(durationMonths),
      price
    },
    note: note || "Tạo thẻ tháng mới",
    performedBy: currentUserId || null
  });

  return {
    success: true,
    message: "Tạo thẻ tháng mới thành công.",
    cardId: card.card_id,
    cardCode: code,
    registrationId: registration.registration_id,
    expiredDate: expiredDateStr
  };
};


/**
 * Cập nhật thông tin thẻ tháng (Biển số xe, tên khách hàng, sđt, email, trạng thái, check-in, check-out)
 */
export const updateMonthCard = async (cardId, payload) => {
  const {
    plate,
    fullName,
    phone,
    email,
    status,
    checkInTime,
    checkOutTime,
    cccd_number,
    cccdNumber
  } = payload;

  const currentCard = await monthCardRepository.findCardStatus(cardId);

  // Không tìm thấy thẻ
  if (!currentCard) {
    throw new Error(`Không tìm thấy thẻ ${cardId}`);
  }

  // Thẻ đã khóa
  if (currentCard.status === "Đã khóa") {

    // Nếu trạng thái không thay đổi thì không cho sửa
    if (status === currentCard.status) {
      throw new Error(
        "Thẻ đã khóa, không được phép chỉnh sửa thông tin."
      );
    }
    // Chỉ cho cập nhật trạng thái
    await monthCardRepository.updateCard(cardId, { status });

    return {
      success: true
    };
  }

  let cleanPlate = plate ? plate.trim() : undefined;
  if (cleanPlate) {
    cleanPlate = cleanPlate.replace(/[\s\.\-]/g, '').toUpperCase();
    const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
    if (!plateRegex.test(cleanPlate)) {
      throw new Error("Biển số xe không đúng định dạng xx(A-Z)xxxxx hoặc xx(A-Z)xxxxx (Ví dụ: 29A12345)");
    }
  }

  // 0. Validate số điện thoại (nếu có nhập)
  let cleanPhone = phone ? phone.trim() : undefined;
  if (cleanPhone) {
    if (!isValidVietnamesePhoneNumber(cleanPhone)) {
      throw new Error("Số điện thoại không hợp lệ. Số điện thoại phải bắt đầu bằng 0, đủ 10 số và đúng đầu số nhà mạng (03/05/07/08/09).");
    }
  }

  // 0.1. Validate email (nếu có nhập)
  let cleanEmail = email ? email.trim() : undefined;
  if (cleanEmail) {
    if (!isValidEmail(cleanEmail)) {
      throw new Error("Email không hợp lệ. Vui lòng nhập đúng định dạng email (ví dụ: ten@domain.com).");
    }
  }

  // 1. Kiểm tra biển số duy nhất của các thẻ đang hoạt động (ngoại trừ thẻ hiện tại)
  let existingVehicle = null;
  if (cleanPlate) {
    const vehicle = await monthCardRepository.findVehicleByPlate(cleanPlate);
    existingVehicle = vehicle;

    if (existingVehicle) {
      const activeReg = await monthCardRepository.findActiveRegistrationByVehicle(existingVehicle.vehicle_id);

      if (activeReg && activeReg.card_id !== cardId) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  // 2. Cập nhật bảng card
  await monthCardRepository.updateCard(cardId, { status });

  // 3. Tìm đăng ký hoạt động của thẻ để lấy xe và khách hàng
  const registration = await monthCardRepository.findActiveRegistrationWithCustomerByCard(cardId);

  if (registration) {
    let vehicleId = registration.vehicle_id;
    const customerId = registration.vehicle?.customer_id;

    // 4. Cập nhật biển số xe ở bảng vehicle hoặc cập nhật liên kết đăng ký
    if (cleanPlate) {
      if (existingVehicle) {
        if (existingVehicle.vehicle_id !== vehicleId) {
          await monthCardRepository.updateRegistrationVehicle(registration.registration_id, existingVehicle.vehicle_id);

          vehicleId = existingVehicle.vehicle_id;

          if (customerId) {
            await monthCardRepository.updateVehicleCustomerId(vehicleId, customerId);
          }
        }
      } else if (vehicleId) {
        await monthCardRepository.updateVehiclePlate(vehicleId, cleanPlate);
      }
    }

    // 5. Cập nhật thông tin khách hàng ở bảng customer
    if (customerId) {
      await monthCardRepository.updateCustomer(customerId, {
        full_name: fullName,
        phone: cleanPhone || null,
        email: cleanEmail || null
      });

      const cleanCccd = (cccd_number || cccdNumber || '').trim();
      if (cleanCccd) {
        await monthCardRepository.insertCustomerKyc(customerId, cleanCccd);
      }
    }

    // 6. Cập nhật session đỗ xe mới nhất của xe này (nếu có)
    if (vehicleId) {
      const session = await monthCardRepository.findLatestParkingSession(vehicleId);

      if (session) {
        await monthCardRepository.updateParkingSession(session.session_id, {
          plate_number: cleanPlate,
          entry_time: checkInTime || null,
          exit_time: checkOutTime || null
        });
      }
    }
  }

  return { success: true };
};
/**
 * Xóa mềm một thẻ tháng:
 * - Kiểm tra thẻ tồn tại và chưa bị xóa
 * - Đánh dấu deleted_at, deleted_by và chuyển status → "Đã khóa"
 * - Ghi log hoạt động để theo dõi lịch sử
 * @param {string} cardId - ID thẻ cần xóa
 * @param {string} performedBy - ID người thực hiện (lấy từ JWT token)
 */
export const deleteMonthCard = async (cardId, performedBy) => {
  // Kiểm tra thẻ có tồn tại và chưa bị xóa trước đó
  const card = await monthCardRepository.findById(cardId);
  if (!card) {
    const e = new Error('Không tìm thấy vé tháng hoặc đã bị xóa');
    e.statusCode = 404; // Trả về HTTP 404 để frontend xử lý đúng
    throw e;
  }
  // Chặn xóa nếu thẻ đang ở trạng thái Hoạt động
  if (card.status === 'Hoạt động') {
    const e = new Error('Không thể xóa thẻ đang ở trạng thái Hoạt động');
    e.statusCode = 400;
    throw e;
  }

  // Thực hiện xóa mềm: ghi deleted_at + deleted_by + đổi status
  const result = await monthCardRepository.softDelete(cardId, performedBy);

  // Ghi log hoạt động để kiểm tra lịch sử về sau
  await monthCardRepository.logActivity({
    card_id: cardId,
    action: 'Xóa thẻ',
    performed_by: performedBy,
    note: `Thẻ ${card.code} đã bị xóa`,
  });

  return result;
};

export const getMonthCards = async (buildingId = null) => {
  const data = await monthCardRepository.getMonthCards(buildingId);

  return await Promise.all(
    data.map(async (card, i) => {
      const activeReg =
        card.card_registrations?.find(
          (r) => r.status === "Hoạt động"
        ) ||
        card.card_registrations?.[0] ||
        null;

      // Mapping trạng thái hiển thị
      // DB status -> Hiển thị
      // 'Hoạt động'  -> 'Hoạt động'
      // 'Đang chờ'   -> 'Sắp hết hạn'
      // 'Đã khóa'    -> 'Hết hạn'
      let statusText = card.status;

      switch (card.status) {
        case "Hoạt động":
          statusText = "Hoạt động";
          break;

        case "Sắp hết hạn":
          statusText = "Đang chờ";
          break;

        case "Hết hạn":
          statusText = "Đã khóa";
          break;

        default:
          statusText = card.status;
      }


      let latestSession = null;

      if (activeReg?.vehicle?.vehicle_id) {
        latestSession = await monthCardRepository.getLatestParkingSessionDetail(
          activeReg.vehicle.vehicle_id
        );
      }

      let cccdNumber = "";
      const kycList = activeReg?.vehicle?.customer?.customer_kyc;
      if (Array.isArray(kycList) && kycList.length > 0) {
        const validKyc = kycList
          .filter(k => k.cccd_number)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (validKyc.length > 0) {
          cccdNumber = validKyc[0].cccd_number;
        }
      }
      if (!cccdNumber && activeReg?.vehicle?.customer?.customer_id) {
        const kycData = await monthCardRepository.getCccdNumberByCustomerId(activeReg.vehicle.customer.customer_id);
        if (kycData?.cccd_number) {
          cccdNumber = kycData.cccd_number;
        }
      }

      return {
        id: String(i + 1).padStart(2, "0"),

        card_id: card.card_id,

        registrationId:
          activeReg?.registration_id || null,

        cardNo: card.code,

        plate:
          activeReg?.vehicle?.plate_number ||
          "Chưa có",

        customer:
          activeReg?.vehicle?.customer?.full_name ||
          "",

        phone:
          activeReg?.vehicle?.customer?.phone ||
          "",

        email:
          activeReg?.vehicle?.customer?.email ||
          "",

        cccd_number: cccdNumber,

        type:
          activeReg?.vehicle?.vehicle_type?.name ||
          "",

        startDate: card.created_at
          ? new Date(card.created_at).toLocaleDateString(
            "vi-VN"
          )
          : "Chưa có",

        endDate: card.expired_date
          ? new Date(card.expired_date).toLocaleDateString(
            "vi-VN"
          )
          : "Không giới hạn",

        expiredDate: card.expired_date,
        created_at: card.created_at,

        status: statusText,

        check_in_time:
          latestSession?.entry_time || "",

        check_out_time:
          latestSession?.exit_time || "",
      };
    })
  );
};

export const getMonthCardLogs = async (buildingId = null) => {
  const data = await monthCardRepository.getMonthCardLogs(buildingId);

  // ─── Kết quả từ card_activity_logs (giao dịch đã hoàn thành) ───────────
  if (!data) return [];

  // Manual join for card codes
  const cardIds = [...new Set(data.map(item => item.card_id).filter(Boolean))];
  const plates = [...new Set(data.map(item => item.plate_number).filter(Boolean))];

  let cardMap = {};
  let ownerMap = {};
  let plateMap = {};


  if (cardIds.length > 0) {
    const cards = await monthCardRepository.getCardsByIds(cardIds);
    if (cards) {
      cards.forEach(c => {
        cardMap[c.card_id] = c.code;
      });
    }

    const regs = await monthCardRepository.getRegistrationsWithCustomerByCardIds(cardIds);

    if (regs) {
      regs.forEach(r => {
        const name = r.vehicle?.customer?.full_name;
        if (name) {
          ownerMap[r.card_id] = name;
        }
        const p = r.vehicle?.plate_number;
        if (p) {
          plateMap[r.card_id] = p;
        }
      });
    }
  }

  if (plates.length > 0) {
    const vehicles = await monthCardRepository.getVehiclesWithCustomerByPlates(plates);
    if (vehicles) {
      vehicles.forEach(v => {
        const name = v.customer?.full_name;
        if (name) {
          ownerMap[v.plate_number] = name;
        }
      });
    }
  }

  // Thu thập order_code từ new_data và note để tra bảng payment lấy payment_method
  let paymentMethodMap = {}; // order_code -> payment_method
  const orderCodes = [];
  const logOrderCodeMap = {}; // log_id -> order_code

  data.forEach(item => {
    let orderCode = null;
    // Ưu tiên lấy từ new_data (gia hạn luôn có)
    if (item.new_data && item.new_data.order_code) {
      orderCode = item.new_data.order_code;
    }
    // Fallback: parse từ note (cấp mới ghi "Đơn: PK...")
    if (!orderCode && item.note) {
      const noteStr = typeof item.note === 'string' ? item.note : JSON.stringify(item.note);
      const match = noteStr.match(/Đơn:\s*(\S+)/);
      if (match) orderCode = match[1];
    }
    if (orderCode) {
      orderCodes.push(orderCode);
      logOrderCodeMap[item.log_id] = orderCode;
    }
  });

  if (orderCodes.length > 0) {
    const uniqueOrderCodes = [...new Set(orderCodes)];
    const payments = await monthCardRepository.getPaymentsByOrderCodes(uniqueOrderCodes);
    if (payments) {
      payments.forEach(p => {
        paymentMethodMap[p.order_code] = p.payment_method; // 'Tiền mặt' | 'VNPay'
      });
    }
  }

  // ─── Giao dịch đang Chờ thanh toán hoặc đã Thất bại (từ bảng payment) ──
  // Tập order_codes đã có trong activity logs (để tránh trùng lặp)
  const completedOrderCodes = new Set(Object.values(logOrderCodeMap));

  const pendingPayments = await monthCardRepository.getPendingAndExpiredMonthCardPayments();

  // Parse note để lấy plate/owner/cardCode cho từng giao dịch pending
  const pendingItemsRaw = pendingPayments
    .filter(p => !completedOrderCodes.has(p.order_code))
    .map(p => {
      let plate = 'Chưa có';
      let owner = 'Khách vãng lai';
      let cardNo = '---';
      let vehicleId = null;
      let cardId = null;
      let reportId = null;
      let type = p.payment_type === 'Gia hạn vé tháng' ? 'Gia hạn'
               : p.payment_type === 'Phí cấp lại thẻ' ? 'Thẻ đã cấp lại'
               : 'Cấp mới';

      const noteStr = typeof p.note === 'string' ? p.note : (p.note ? JSON.stringify(p.note) : '');

      // 1. Regex match UUID to find reportId in note (works for both JSON and plain text)
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const uuidMatch = noteStr.match(uuidRegex);
      if (uuidMatch) {
        reportId = uuidMatch[0];
      }

      let noteObj = null;
      if (p.note && typeof p.note === 'object') {
        noteObj = p.note;
      } else if (typeof p.note === 'string') {
        try {
          noteObj = JSON.parse(p.note);
        } catch (e) { /* bỏ qua lỗi parse note dạng plain text */ }
      }

      if (noteObj) {
        if (p.payment_type === 'Gia hạn vé tháng') {
          cardNo = noteObj.cardCode || '---';
          vehicleId = noteObj.vehicleId || null;
        } else if (p.payment_type === 'Phí cấp lại thẻ') {
          cardNo = noteObj.newCode || '---';
          cardId = noteObj.cardId || null;
          vehicleId = noteObj.vehicleId || null;
          if (noteObj.reportId) {
            reportId = noteObj.reportId;
          }
        } else {
          plate = noteObj.vehicle_info?.plate_number || 'Chưa có';
          owner = noteObj.customer_info?.full_name || 'Khách vãng lai';
        }
      }

      const displayStatus = (p.status === 'Hết hạn' || p.status === 'Thất bại') ? 'Thất bại' : 'Chờ thanh toán';
      const amountNum = Number(p.amount) || 0;
      const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountNum).replace('₫', 'đ');

      return {
        time: new Date(p.payment_time).toLocaleString('vi-VN'),
        timestamp: p.payment_time,
        cardNo,
        plate,
        owner,
        type,
        amount: amountStr,
        status: displayStatus,
        paymentMethod: p.payment_method || 'Tiền mặt',
        orderCode: p.order_code,
        paymentInfo: p.payment_method === 'VNPay' ? { order_code: p.order_code, transaction_no: null } : null,
        _vehicleId: vehicleId,
        _cardId: cardId,
        _reportId: reportId
      };
    });

  // 1. Batch lookup card_lost_log cho những items có _reportId để giải quyết card_id / vehicle_id
  const reportIdsToLookup = [...new Set(pendingItemsRaw.map(i => i._reportId).filter(Boolean))];
  if (reportIdsToLookup.length > 0) {
    try {
      const reports = await monthCardRepository.getLostReportsByIds(reportIdsToLookup);
      const reportMap = {};
      reports.forEach(r => {
        reportMap[r.lost_report_id] = r;
      });
      pendingItemsRaw.forEach(item => {
        if (item._reportId && reportMap[item._reportId]) {
          const r = reportMap[item._reportId];
          if (!item._cardId) item._cardId = r.card_id;
          if (!item._vehicleId) item._vehicleId = r.vehicle_id;
        }
      });
    } catch (err) {
      console.error("Lỗi khi tra cứu card_lost_logs cho pending items:", err);
    }
  }

  // 2. Batch lookup biển số và chủ xe qua _vehicleId
  const vehicleIdsToLookup = [...new Set(pendingItemsRaw.map(i => i._vehicleId).filter(Boolean))];
  if (vehicleIdsToLookup.length > 0) {
    try {
      const vehicleInfos = await monthCardRepository.getVehiclesByIds(vehicleIdsToLookup);
      const vehiclePlateMap = {};
      const vehicleOwnerMap = {};
      vehicleInfos.forEach(v => {
        vehiclePlateMap[v.vehicle_id] = v.plate_number;
        vehicleOwnerMap[v.vehicle_id] = v.customer?.full_name || 'Khách vãng lai';
      });
      pendingItemsRaw.forEach(item => {
        if (item._vehicleId) {
          item.plate = vehiclePlateMap[item._vehicleId] || item.plate;
          item.owner = vehicleOwnerMap[item._vehicleId] || item.owner;
        }
      });
    } catch (err) {
      console.error("Lỗi khi tra cứu xe theo vehicleId:", err);
    }
  }

  // 3. Batch lookup biển số, chủ xe và mã thẻ qua _cardId (khi không có registration trực tiếp hoặc thiếu thông tin)
  const cardIdsToLookup = [...new Set(pendingItemsRaw.map(i => i._cardId).filter(Boolean))];
  if (cardIdsToLookup.length > 0) {
    try {
      const regs = await monthCardRepository.getRegistrationsWithCustomerByCardIds(cardIdsToLookup);
      const cardRegMap = {};
      regs.forEach(r => {
        cardRegMap[r.card_id] = r;
      });

      const cards = await monthCardRepository.getCardsByIds(cardIdsToLookup);
      const cardCodeMap = {};
      cards.forEach(c => {
        cardCodeMap[c.card_id] = c.code;
      });

      pendingItemsRaw.forEach(item => {
        if (item._cardId) {
          const reg = cardRegMap[item._cardId];
          if (reg && reg.vehicle) {
            if (item.plate === 'Chưa có' || !item.plate) {
              item.plate = reg.vehicle.plate_number || 'Chưa có';
            }
            if (item.owner === 'Khách vãng lai' || !item.owner) {
              item.owner = reg.vehicle.customer?.full_name || 'Khách vãng lai';
            }
          }
          if (item.cardNo === '---' || item.cardNo === '') {
            item.cardNo = cardCodeMap[item._cardId] || '---';
          }
        }
      });
    } catch (err) {
      console.error("Lỗi khi tra cứu card registrations cho pending items:", err);
    }
  }

  // Xóa các trường phục vụ lookup nội bộ khỏi kết quả trả về
  const pendingItems = pendingItemsRaw.map(({ _vehicleId, _cardId, _reportId, ...rest }) => rest);


  const completedItems = data.map((item, idx) => {
    const cardCode = cardMap[item.card_id] || `CARD${1000 + idx}`;
    const plate = item.plate_number || plateMap[item.card_id] || "Chưa có";
    const owner = item.customer_name || ownerMap[item.card_id] || ownerMap[item.plate_number] || "Khách vãng lai";
    const time = new Date(item.performed_at).toLocaleString('vi-VN');

    let amountVal = item.amount ? Number(item.amount) : 0;
    if (amountVal === 0 && item.action === 'Thẻ đã cấp lại') {
      amountVal = 0;
    }
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVal).replace('₫', 'đ');
    const status = "Thành công";

    let type = item.action;
    if (item.action === 'Đã gia hạn' || item.action === 'Gia hạn') {
      type = 'Gia hạn';
    } else if (item.action === 'Tạo thẻ tháng mới' || item.action === 'Cấp mới') {
      type = 'Cấp mới';
    }

    // Xác định phương thức thanh toán từ bảng payment
    const oc = logOrderCodeMap[item.log_id];
    const dbPaymentMethod = oc ? paymentMethodMap[oc] : null;
    // DB lưu 'VNPay' hoặc 'Tiền mặt', frontend cần đúng giá trị này
    const paymentMethod = dbPaymentMethod || 'Tiền mặt';

    return {
      time,
      timestamp: item.performed_at,
      cardNo: cardCode,
      plate,
      owner,
      type,
      amount,
      status,
      paymentMethod,
      orderCode: oc || null,
      paymentInfo: dbPaymentMethod === 'VNPay' && oc ? { order_code: oc, transaction_no: null } : null
    };
  });

  // ─── Gộp completed logs + pending/failed và sắp xếp theo thời gian mới nhất ───
  const allItems = [...pendingItems, ...completedItems];
  allItems.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  return allItems;
};



/**
 * Kiểm tra trạng thái biển số xe phục vụ bước 2 đăng ký
 * @param {string} plate
 * @returns {Promise<{ allowed: boolean, message?: string }>}
 */
export const checkPlateStatus = async (plate) => {
  if (!plate || !plate.trim()) {
    throw new Error("Biển số xe không được để trống.");
  }
  const cleanPlate = plate.replace(/[\s\.\-]/g, '').toUpperCase();

  // Tìm xe theo biển số cùng thẻ đang liên kết hoạt động
  const vehicle = await monthCardRepository.findVehicleWithRegistrationsByPlate(cleanPlate);

  if (!vehicle) {
    // Trường hợp 2: chưa gán xe (vì chưa tồn tại) và chưa gán thẻ -> Được đi tiếp
    return { allowed: true };
  }

  // Tìm đăng ký thẻ đang hoạt động liên kết với xe
  const activeReg = vehicle.card_registrations?.find(r => r.status === 'Hoạt động');
  const cardType = activeReg?.card?.type; // 'Thẻ tháng' hoặc 'Thẻ lượt'

  if (cardType) {
    // Có thẻ liên kết
    if (vehicle.vehicle_type_id) {
      // Trường hợp 1: Đã gắn loại xe AND đã gắn với 1 loại thẻ -> KHÔNG ĐƯỢC đi tiếp
      return {
        allowed: false,
        message: `Biển số xe ${cleanPlate} đã được gắn với loại xe và đang liên kết với ${cardType} (${activeReg.card?.code || ''}). Không thể tiếp tục đăng ký.`
      };
    } else {
      // Trường hợp 2: Chưa gắn loại xe AND đã gắn với 1 loại thẻ -> ĐƯỢC đi tiếp
      return { allowed: true };
    }
  }

  // Xe tồn tại nhưng chưa có thẻ liên kết -> Được đi tiếp
  return { allowed: true };
};

/**
 * Lấy mã thẻ tháng tiếp theo (Tìm thẻ 'Đang chờ' hoặc tự động sinh mới)
 * @returns {Promise<{ code: string }>}
 */
export const getNextMonthCode = async () => {
  // 1. Tìm thẻ tháng có trạng thái 'Đang chờ'
  const pendingCard = await monthCardRepository.findPendingMonthCard();

  if (pendingCard) {
    // Trường hợp 1: có thẻ đang chờ thì sử dụng mã thẻ đó
    return { code: pendingCard.code };
  }

  // Trường hợp 2: không còn thẻ đang chờ -> đếm số lượng thẻ hiện tại để kiểm tra giới hạn 50
  const count = await monthCardRepository.countActiveMonthCards();

  if (count >= config.maxMonthCards) {
    throw new Error(`Hệ thống đã đạt giới hạn tối đa ${config.maxMonthCards} thẻ tháng (full slot đăng ký). Không thể tạo thẻ mới.`);
  }

  // Tự sinh mã mới
  const nextCode = await monthCardRepository.generateNextMonthCode();
  return { code: nextCode };
};
/**
 * Lấy chi tiết thông tin thẻ tháng để tạo hợp đồng
 * @param {string} cardId 
 * @returns {Promise<object>}
 */
export const getCardDetailsForContract = async (cardId) => {
  const card = await monthCardRepository.getCardDetailsForContract(cardId);

  if (!card) throw new Error("Không tìm thấy thông tin thẻ tháng");

  const activeReg = card.card_registrations?.find(r => r.status === "Hoạt động") || card.card_registrations?.[0] || null;
  const vehicle = activeReg?.vehicle || null;
  const customer = vehicle?.customer || null;

  // Lấy cccd_number từ customer_kyc
  let cccdNumber = "---";
  if (customer?.customer_id) {
    const kycData = await monthCardRepository.getCccdNumberByCustomerId(customer.customer_id);
    if (kycData?.cccd_number) {
      cccdNumber = kycData.cccd_number;
    }
  }

  // Lấy vehicle_package mới nhất (end_date lớn nhất)
  let latestPackage = null;
  if (vehicle?.vehicle_package && vehicle.vehicle_package.length > 0) {
    latestPackage = [...vehicle.vehicle_package].sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
  }

  // Truy vấn chi tiết package nếu có package_id
  let packageInfo = null;
  if (latestPackage?.package_id) {
    packageInfo = await monthCardRepository.getPackageById(latestPackage.package_id);
  }

  // Truy vấn thông tin payment liên kết với vehicle_package
  let paymentInfo = null;
  if (latestPackage?.vehicle_package_id) {
    paymentInfo = await monthCardRepository.getLatestPaymentByVehiclePackage(latestPackage.vehicle_package_id);
  }

  return {
    card_id: card.card_id,
    card_code: card.code,
    status: card.status,
    created_at: card.created_at,
    expired_date: card.expired_date,
    customer: customer ? {
      customer_id: customer.customer_id,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      cccd_number: cccdNumber
    } : null,
    vehicle: vehicle ? {
      vehicle_id: vehicle.vehicle_id,
      plate_number: vehicle.plate_number,
      brand: vehicle.brand,
      color: vehicle.color,
      type_name: vehicle.vehicle_type?.name || "",
    } : null,
    package: latestPackage ? {
      start_date: latestPackage.start_date,
      end_date: latestPackage.end_date,
      name: packageInfo?.name || `Gói cước tháng ${vehicle?.vehicle_type?.name || "xe máy/ô tô"}`,
      price: packageInfo?.price || paymentInfo?.amount || 300000,
      duration_month: packageInfo?.duration_month || 1
    } : null,
    payment: paymentInfo ? {
      amount: paymentInfo.amount,
      payment_method: paymentInfo.payment_method,
      status: paymentInfo.status,
      payment_time: paymentInfo.payment_time
    } : null
  };
};

// ─────────────────────────────────────────────────────────────
// VEHICLE TYPES & PACKAGES
// ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách loại xe
 * @returns {Promise<object[]>}
 */
export const getVehicleTypes = async () => {
  return await monthCardRepository.getAllVehicleTypes();
};

/**
 * Lấy danh sách gói cước đang hoạt động, lọc theo building của user nếu có
 * @param {string|null} userId - UUID user từ JWT token
 * @returns {Promise<object[]>}
 */
export const getPackages = async (userId) => {
  let priceTableIds = null;

  if (userId) {
    priceTableIds = await monthCardRepository.getPriceTableIdsByUserId(userId);
  }

  return await monthCardRepository.getActivePackages(priceTableIds);
};
