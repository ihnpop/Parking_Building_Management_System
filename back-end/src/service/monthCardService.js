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
    .in("status", ["ACTIVE", "Hoạt động"])
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
