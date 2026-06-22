import * as monthCardRepository from "../repositories/monthCardRepository.js";
import supabase from "../config/supabaseClient.js";

// Bảng giá gói gia hạn cố định
export const RENEW_PACKAGES = [
  { months: 1, price: 300000 },
  { months: 3, price: 850000 },
  { months: 6, price: 1650000 },
  { months: 9, price: 2400000 },
  { months: 12, price: 3000000 }
];

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
  // 1. Validate package
  const pkg = RENEW_PACKAGES.find(p => p.months === Number(months));
  if (!pkg) {
    throw new Error("Gói gia hạn không hợp lệ.");
  }

  // 2. Kiểm tra đăng ký tồn tại
  const registration = await monthCardRepository.findRegistrationWithCard(registrationId);
  if (!registration) {
    throw new Error("Không tìm thấy thông tin đăng ký thẻ.");
  }

  const card = registration.card;
  if (!card) {
    throw new Error("Không tìm thấy thẻ liên kết với đăng ký này.");
  }

  // 3. Kiểm tra tính hợp lệ của Thẻ (Card)
  if (card.status === 'Đã xóa') {
    throw new Error("Không thể gia hạn thẻ đã bị xóa.");
  }
  if (card.status === 'Đã khóa') {
    throw new Error("Không thể gia hạn thẻ đã bị khóa.");
  }
  if (card.type !== 'Thẻ tháng') {
    throw new Error("Chỉ cho phép gia hạn đối với thẻ tháng.");
  }

  // 4. Kiểm tra tính hợp lệ của Đăng ký (Registration)
  const isRegActive = registration.status === 'Hoạt động';
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
    action: 'CARD_RENEWED',
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
  currentUserId
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

  const cleanPlate = plate.trim().toUpperCase();

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
    await supabase
      .from("vehicle")
      .update({ customer_id: customerId })
      .eq("vehicle_id", vehicle.vehicle_id);
  }

  // 5. Tính ngày hết hạn
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const expiredDateObj = addMonthsSafely(start, Number(durationMonths));
  const expiredDateStr = expiredDateObj.toISOString().split("T")[0];

  // 6. Sinh mã thẻ tự động (MT000001, MT000002, ...)
  const totalCards = await monthCardRepository.countCards();
  const code = `MONTH${String(totalCards + 1).padStart(4, "0")}`;

  const cardStatus = status || "Hoạt động";

  // 7. Tạo thẻ
  const card = await monthCardRepository.createCard({
    code,
    type: "Thẻ tháng",
    status: cardStatus,
    expiredDate: expiredDateStr
  });

  // 8. Tạo đăng ký thẻ (liên kết thẻ với xe)
  const registration = await monthCardRepository.createRegistration({
    cardId: card.card_id,
    vehicleId: vehicle.vehicle_id,
    status: "Hoạt động"
  });

  // 9. Ghi log hoạt động
  await monthCardRepository.createActivityLog({
    cardId: card.card_id,
    registrationId: registration.registration_id,
    action: "Tạo thẻ tháng mới",
    oldData: null,
    newData: {
      code,
      plate: cleanPlate,
      expired_date: expiredDateStr,
      months: Number(durationMonths)
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
    checkOutTime
  } = payload;

  const cleanPlate = plate ? plate.trim() : undefined;

  // 1. Kiểm tra biển số duy nhất của các thẻ đang hoạt động (ngoại trừ thẻ hiện tại)
  if (cleanPlate) {
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', cleanPlate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    if (vehicle) {
      const { data: activeReg, error: regCheckErr } = await supabase
        .from('card_registrations')
        .select(`
          registration_id,
          card_id,
          card (
            code
          )
        `)
        .eq('vehicle_id', vehicle.vehicle_id)
        .in('status', ['Hoạt động', 'ACTIVE'])
        .maybeSingle();

      if (regCheckErr) throw new Error(regCheckErr.message);

      if (activeReg && activeReg.card_id !== cardId) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  // 2. Cập nhật bảng card
  const { error: cardErr } = await supabase
    .from("card")
    .update({ status })
    .eq("card_id", cardId);

  if (cardErr) throw new Error(cardErr.message);

  // 3. Tìm đăng ký hoạt động của thẻ để lấy xe và khách hàng
  const { data: registration, error: regErr } = await supabase
    .from("card_registrations")
    .select(`
      vehicle_id,
      vehicle (
        customer_id
      )
    `)
    .eq("card_id", cardId)
    .in("status", ["Hoạt động"])
    .maybeSingle();

  if (regErr) throw new Error(regErr.message);

  if (registration) {
    const vehicleId = registration.vehicle_id;
    const customerId = registration.vehicle?.customer_id;

    // 4. Cập nhật biển số xe ở bảng vehicle
    if (cleanPlate && vehicleId) {
      const { error: vehErr } = await supabase
        .from("vehicle")
        .update({ plate_number: cleanPlate })
        .eq("vehicle_id", vehicleId);

      if (vehErr) throw new Error(vehErr.message);
    }

    // 5. Cập nhật thông tin khách hàng ở bảng customer
    if (customerId) {
      const { error: custErr } = await supabase
        .from("customer")
        .update({
          full_name: fullName,
          phone: phone || null,
          email: email || null
        })
        .eq("customer_id", customerId);

      if (custErr) throw new Error(custErr.message);
    }

    // 6. Cập nhật session đỗ xe mới nhất của xe này (nếu có)
    if (vehicleId) {
      const { data: session } = await supabase
        .from("parking_sessions")
        .select("session_id")
        .eq("vehicle_id", vehicleId)
        .order("entry_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const { error: sessErr } = await supabase
          .from("parking_sessions")
          .update({
            plate_number: cleanPlate,
            entry_time: checkInTime || null,
            exit_time: checkOutTime || null
          })
          .eq("session_id", session.session_id);

        if (sessErr) throw new Error(sessErr.message);
      }
    }
  }

  return { success: true };
};
