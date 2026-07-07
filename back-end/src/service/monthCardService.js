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

  // 6.5. Cập nhật hoặc thêm mới vehicle_package cho xe tháng khi gia hạn
  let vehiclePackageId = null;
  try {
    const { data: existingVp, error: vpFindErr } = await supabase
      .from('vehicle_package')
      .select('vehicle_package_id')
      .eq('vehicle_id', registration.vehicle_id)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingVp) {
      const { data: updatedVp, error: vpUpdateErr } = await supabase
        .from('vehicle_package')
        .update({
          end_date: newExpiryDateStr,
          status: 'ACTIVE'
        })
        .eq('vehicle_package_id', existingVp.vehicle_package_id)
        .select()
        .single();
      if (vpUpdateErr) {
        console.error("Lỗi cập nhật vehicle_package khi gia hạn:", vpUpdateErr.message);
      } else {
        vehiclePackageId = updatedVp.vehicle_package_id;
      }
    } else {
      const { data: newVp, error: vpInsertErr } = await supabase
        .from('vehicle_package')
        .insert({
          vehicle_id: registration.vehicle_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: newExpiryDateStr,
          status: 'ACTIVE'
        })
        .select()
        .single();
      if (vpInsertErr) {
        console.error("Lỗi insert vehicle_package khi gia hạn:", vpInsertErr.message);
      } else {
        vehiclePackageId = newVp.vehicle_package_id;
      }
    }
  } catch (vpEx) {
    console.error("Exception handling vehicle_package on renew:", vpEx);
  }

  // 6.6. Tạo payment record (MONTHLY_RENEW)
  if (vehiclePackageId) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: dupPayment } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('vehicle_package_id', vehiclePackageId)
        .eq('payment_type', 'MONTHLY_RENEW')
        .eq('amount', pkg.price)
        .gte('payment_time', oneMinuteAgo)
        .maybeSingle();

      if (!dupPayment) {
        const { error: paymentErr } = await supabase
          .from('payment')
          .insert({
            vehicle_package_id: vehiclePackageId,
            amount: pkg.price,
            payment_method: 'Cash',
            status: 'Đã thanh toán',
            payment_time: new Date().toISOString(),
            payment_type: 'MONTHLY_RENEW',
            created_by: currentUserId || null
          });
        if (paymentErr) {
          console.error("Lỗi insert payment khi gia hạn:", paymentErr.message);
        }
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

  const cardStatus = status || "Hoạt động";
  let card = null;

  // 6. Tìm thẻ tháng có trạng thái 'Đang chờ'
  const { data: pendingCard, error: pendingErr } = await supabase
    .from('card')
    .select('*')
    .eq('type', 'Thẻ tháng')
    .eq('status', 'Đang chờ')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    throw new Error("Lỗi tìm thẻ đang chờ: " + pendingErr.message);
  }

  let code = "";
  if (pendingCard) {
    // Trường hợp 1: Sử dụng thẻ đang chờ
    code = pendingCard.code;
    const { data: updatedCard, error: updateErr } = await supabase
      .from('card')
      .update({
        status: cardStatus,
        expired_date: expiredDateStr,
        created_at: startDate || new Date().toISOString()
      })
      .eq('card_id', pendingCard.card_id)
      .select()
      .single();

    if (updateErr) throw new Error("Lỗi cập nhật thẻ đang chờ: " + updateErr.message);
    card = updatedCard;
  } else {
    // Trường hợp 2: Không còn thẻ đang chờ -> đếm và sinh mã mới
    const { count, error: countErr } = await supabase
      .from('card')
      .select('card_id', { count: 'exact', head: true })
      .eq('type', 'Thẻ tháng')
      .not('status', 'eq', 'Đã xóa');

    if (countErr) throw new Error("Lỗi kiểm tra giới hạn thẻ tháng: " + countErr.message);

    if (count >= 50) {
      throw new Error("Hệ thống đã đạt giới hạn tối đa 50 thẻ tháng (full slot đăng ký).");
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
    const { data: matchedPkg } = await supabase
      .from('package')
      .select('package_id, price')
      .eq('vehicle_type_id', vehicleTypeId)
      .eq('duration_month', duration)
      .eq('status', 'Hoạt động')
      .limit(1)
      .maybeSingle();

    if (matchedPkg) {
      packageId = matchedPkg.package_id;
      price = Number(matchedPkg.price) || 0;
    } else {
      const fallbackPkg = RENEW_PACKAGES.find(p => p.months === duration);
      price = fallbackPkg ? fallbackPkg.price : (duration * 300000);
    }
  } catch (pkgErr) {
    console.error("Error finding package for new card:", pkgErr);
    const duration = Number(durationMonths) || 1;
    const fallbackPkg = RENEW_PACKAGES.find(p => p.months === duration);
    price = fallbackPkg ? fallbackPkg.price : (duration * 300000);
  }

  let vehiclePackageId = null;
  try {
    const { data: newVp, error: vpInsertErr } = await supabase
      .from('vehicle_package')
      .insert({
        vehicle_id: vehicle.vehicle_id,
        package_id: packageId,
        start_date: start.toISOString().split('T')[0],
        end_date: expiredDateStr,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (vpInsertErr) {
      console.error("Lỗi insert vehicle_package khi tạo thẻ tháng:", vpInsertErr.message);
    } else {
      vehiclePackageId = newVp.vehicle_package_id;
    }
  } catch (vpEx) {
    console.error("Exception insert vehicle_package:", vpEx);
  }

  // 8.6. Tạo payment record (MONTHLY_NEW)
  if (vehiclePackageId) {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data: dupPayment } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('vehicle_package_id', vehiclePackageId)
        .eq('payment_type', 'MONTHLY_NEW')
        .gte('payment_time', oneMinuteAgo)
        .maybeSingle();

      if (!dupPayment) {
        const { error: paymentErr } = await supabase
          .from('payment')
          .insert({
            vehicle_package_id: vehiclePackageId,
            amount: price,
            payment_method: 'Cash',
            status: 'Đã thanh toán',
            payment_time: new Date().toISOString(),
            payment_type: 'MONTHLY_NEW',
            created_by: currentUserId || null
          });
        if (paymentErr) {
          console.error("Lỗi insert payment khi tạo thẻ tháng:", paymentErr.message);
        }
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
    checkOutTime
  } = payload;

  const { data: currentCard, error: currentCardErr } = await supabase
    .from("card")
    .select("status")
    .eq("card_id", cardId)
    .single();

  if (currentCardErr) {
    throw new Error(currentCardErr.message);
  }

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
    const { error: cardErr } = await supabase
      .from("card")
      .update({ status })
      .eq("card_id", cardId);

    if (cardErr) {
      throw new Error(cardErr.message);
    }

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

  // 1. Kiểm tra biển số duy nhất của các thẻ đang hoạt động (ngoại trừ thẻ hiện tại)
  let existingVehicle = null;
  if (cleanPlate) {
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', cleanPlate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);
    existingVehicle = vehicle;

    if (existingVehicle) {
      const { data: activeReg, error: regCheckErr } = await supabase
        .from('card_registrations')
        .select(`
          registration_id,
          card_id,
          card (
            code
          )
        `)
        .eq('vehicle_id', existingVehicle.vehicle_id)
        .in('status', ['Hoạt động'])
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
      registration_id,
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
    let vehicleId = registration.vehicle_id;
    const customerId = registration.vehicle?.customer_id;

    // 4. Cập nhật biển số xe ở bảng vehicle hoặc cập nhật liên kết đăng ký
    if (cleanPlate) {
      if (existingVehicle) {
        if (existingVehicle.vehicle_id !== vehicleId) {
          const { error: updateRegErr } = await supabase
            .from("card_registrations")
            .update({ vehicle_id: existingVehicle.vehicle_id })
            .eq("registration_id", registration.registration_id);

          if (updateRegErr) throw new Error(updateRegErr.message);

          vehicleId = existingVehicle.vehicle_id;

          if (customerId) {
            await supabase
              .from("vehicle")
              .update({ customer_id: customerId })
              .eq("vehicle_id", vehicleId);
          }
        }
      } else if (vehicleId) {
        const { error: vehErr } = await supabase
          .from("vehicle")
          .update({ plate_number: cleanPlate })
          .eq("vehicle_id", vehicleId);

        if (vehErr) throw new Error(vehErr.message);
      }
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

export const getMonthCards = async () => {
  const { data, error } = await supabase
    .from("card")
    .select(`
      card_id,
      code,
      type,
      expired_date,
      status,
      created_at,
      card_registrations (
        registration_id,
        status,
        created_at,
        vehicle (
          vehicle_id,
          plate_number,
          customer (
            customer_id,
            full_name,
            phone,
            email
          ),
          vehicle_type (
            name
          )
        )
      )
    `)
    .eq("type", "Thẻ tháng")
    .not("status", "eq", "Đã xóa")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

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
        const { data: sessions } = await supabase
          .from("parking_sessions")
          .select(`
            session_id,
            entry_time,
            exit_time
          `)
          .eq(
            "vehicle_id",
            activeReg.vehicle.vehicle_id
          )
          .order("entry_time", {
            ascending: false,
          })
          .limit(1);

        latestSession = sessions?.[0] || null;
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

export const getMonthCardLogs = async () => {
  const { data, error } = await supabase
    .from("card_activity_logs")
    .select(`
      log_id,
      card_id,
      action,
      plate_number,
      customer_name,
      amount,
      duration_months,
      performed_at
    `)
    .order("performed_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Manual join for card codes
  const cardIds = [...new Set(data.map(item => item.card_id).filter(Boolean))];
  let cardMap = {};
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from('card')
      .select('card_id, code')
      .in('card_id', cardIds);
    if (cards) {
      cards.forEach(c => {
        cardMap[c.card_id] = c.code;
      });
    }
  }

  return data.map((item, idx) => {

    const cardCode = cardMap[item.card_id] || `CARD${1000 + idx}`;
    const plate = item.plate_number || "Chưa có";
    const owner = item.customer_name || "Khách vãng lai";
    const time = new Date(item.performed_at).toLocaleString('vi-VN');
    const amountVal = item.amount ? Number(item.amount) : 0;
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountVal);
    const status = "Thành công";

    let type = item.action;
    if (item.action === 'Đã gia hạn' || item.action === 'Gia hạn') {
      type = 'Gia hạn';
    } else if (item.action === 'Tạo thẻ tháng mới' || item.action === 'Cấp mới') {
      type = 'Cấp mới';
    }
    return {
      time,
      cardNo: cardCode,
      plate,
      owner,
      type,
      amount,
      status
    };
  });
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
  const { data: vehicle, error } = await supabase
    .from('vehicle')
    .select(`
      vehicle_id,
      vehicle_type_id,
      card_registrations (
        registration_id,
        status,
        card (
          card_id,
          code,
          type
        )
      )
    `)
    .eq('plate_number', cleanPlate)
    .maybeSingle();

  if (error) {
    throw new Error("Lỗi truy vấn biển số xe: " + error.message);
  }

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
  const { data: pendingCard, error: pendingErr } = await supabase
    .from('card')
    .select('code')
    .eq('type', 'Thẻ tháng')
    .eq('status', 'Đang chờ')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    throw new Error("Lỗi tìm thẻ đang chờ: " + pendingErr.message);
  }

  if (pendingCard) {
    // Trường hợp 1: có thẻ đang chờ thì sử dụng mã thẻ đó
    return { code: pendingCard.code };
  }

  // Trường hợp 2: không còn thẻ đang chờ -> đếm số lượng thẻ hiện tại để kiểm tra giới hạn 50
  const { count, error: countErr } = await supabase
    .from('card')
    .select('card_id', { count: 'exact', head: true })
    .eq('type', 'Thẻ tháng')
    .not('status', 'eq', 'Đã xóa');

  if (countErr) {
    throw new Error("Lỗi đếm số lượng thẻ tháng: " + countErr.message);
  }

  if (count >= 50) {
    throw new Error("Hệ thống đã đạt giới hạn tối đa 50 thẻ tháng (full slot đăng ký). Không thể tạo thẻ mới.");
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
  const { data: card, error } = await supabase
    .from("card")
    .select(`
      card_id,
      code,
      type,
      expired_date,
      status,
      created_at,
      card_registrations (
        registration_id,
        status,
        created_at,
        vehicle (
          vehicle_id,
          plate_number,
          brand,
          color,
          customer (
            customer_id,
            full_name,
            phone,
            email
          ),
          vehicle_type (
            vehicle_type_id,
            name
          ),
          vehicle_package (
            vehicle_package_id,
            start_date,
            end_date,
            status,
            package_id
          )
        )
      )
    `)
    .eq("card_id", cardId)
    .single();

  if (error) throw new Error(error.message);
  if (!card) throw new Error("Không tìm thấy thông tin thẻ tháng");

  const activeReg = card.card_registrations?.find(r => r.status === "Hoạt động") || card.card_registrations?.[0] || null;
  const vehicle = activeReg?.vehicle || null;
  const customer = vehicle?.customer || null;
  
  // Lấy cccd_number từ customer_kyc
  let cccdNumber = "---";
  if (customer?.customer_id) {
    const { data: kycData } = await supabase
      .from('customer_kyc')
      .select('cccd_number')
      .eq('customer_id', customer.customer_id)
      .maybeSingle();
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
    const { data: pkg } = await supabase
      .from('package')
      .select('name, price, duration_month')
      .eq('package_id', latestPackage.package_id)
      .maybeSingle();
    if (pkg) {
      packageInfo = pkg;
    }
  }

  // Truy vấn thông tin payment liên kết với vehicle_package
  let paymentInfo = null;
  if (latestPackage?.vehicle_package_id) {
    const { data: pay } = await supabase
      .from('payment')
      .select('amount, payment_method, status, payment_time')
      .eq('vehicle_package_id', latestPackage.vehicle_package_id)
      .order('payment_time', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pay) {
      paymentInfo = pay;
    }
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



