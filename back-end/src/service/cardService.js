import * as cardRepository from "../repositories/cardRepository.js";
import * as lostCardRepository from "../repositories/lostCardRepository.js";

export const getCards = async () => {
  const cards = await cardRepository.getCardsWithType('Thẻ lượt');

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map(c => c.card_id);

  const registrations = await cardRepository.getRegistrationsByCardIds(cardIds);

  const regMap = {};
  registrations?.forEach(reg => {
    if (!regMap[reg.card_id]) {
      regMap[reg.card_id] = [];
    }
    regMap[reg.card_id].push(reg);
  });

  return await Promise.all(
    cards.map(async (item) => {
      const cardRegs = regMap[item.card_id] || [];
      const activeReg = cardRegs.find(r => r.status === 'Hoạt động') ?? null;

      let latestSession = null;

      if (activeReg?.vehicle?.vehicle_id) {
        latestSession = await cardRepository.getLatestSessionByVehicle(activeReg.vehicle.vehicle_id);
      }

      return {
        card_id: item.card_id,
        code: item.code,
        type: item.type,
        expired_date: item.expired_date,
        status: item.status,
        created_at: item.created_at,
        plate: activeReg?.vehicle?.plate_number || "",
        fullName: activeReg?.vehicle?.customer?.full_name || "",
        phone: activeReg?.vehicle?.customer?.phone || "",
        email: activeReg?.vehicle?.customer?.email || "",
        check_in_time: latestSession?.entry_time || '',
        check_out_time: latestSession?.exit_time || '',
        customer_name: activeReg?.vehicle?.customer?.full_name || "Chưa đăng ký",
        vehicle_id: activeReg?.vehicle?.vehicle_id || null,
        customer_id: activeReg?.vehicle?.customer?.customer_id || null
      };
    })
  );
};

export const getMonthCardLogs = async () => {
  const data = await cardRepository.getPaymentLogs();

  return data.map((item) => {
    const plate = item.parking_order?.vehicle?.plate_number || "Chưa có";
    const owner = item.parking_order?.vehicle?.customer?.full_name || "Khách vãng lai";
    const time = new Date(item.payment_time).toLocaleString('vi-VN');
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
    const status = (item.status === 'PAID' || item.status === 'Đã thanh toán')
      ? 'Thành công'
      : item.status === 'PENDING'
        ? 'Đang xử lý'
        : 'Thất bại';

    return {
      time,
      plate,
      owner,
      type: item.amount > 500000 ? 'Gia hạn' : 'Cấp mới',
      amount,
      status
    };
  });
};



export const createCard = async ({ type, startDate, plate, fullName, phone, email, durationMonths }) => {
  // ================================================================
  // BƯỚC 1: Xác thực định dạng biển số xe
  // ================================================================
  let cleanPlate = plate ? plate.trim() : undefined;
  if (cleanPlate) {
    cleanPlate = cleanPlate.replace(/[\s\.\-]/g, '').toUpperCase();
    const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
    if (!plateRegex.test(cleanPlate)) {
      throw new Error("Biển số xe không đúng định dạng xx(A-Z)xxxxx hoặc xx(A-Z)xxxx (Ví dụ: 29A12345)");
    }
  }

  // Validate plate uniqueness among active cards
  if (cleanPlate) {
    const vehicle = await cardRepository.findVehicleByPlate(cleanPlate);

    if (vehicle) {
      const activeReg = await cardRepository.findActiveRegByVehicleId(vehicle.vehicle_id);

      if (activeReg) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  // ================================================================
  // BƯỚC 2: Tạo thẻ mới
  // ================================================================

  // Theo dõi các bản ghi đã tạo để rollback thủ công nếu có lỗi
  let cardToUse = null;
  let newVehicleId = null;   // chỉ set nếu vehicle được tạo mới trong request này
  let newCustomerId = null;  // chỉ set nếu customer được tạo mới trong request này

  try {
    if (type === 'Thẻ lượt') {
      // Tìm thẻ lượt có trạng thái "Đang chờ" để tái sử dụng
      const waitingCard = await cardRepository.findWaitingCard(type);

      if (waitingCard) {
        // Trường hợp 1: Tái sử dụng thẻ đang chờ, cập nhật lại trạng thái và ngày tạo
        cardToUse = await cardRepository.reuseWaitingCard(waitingCard.card_id, startDate);
      }
    }

    // Trường hợp 2 hoặc khi không phải Thẻ lượt hoặc không tìm thấy thẻ đang chờ
    if (!cardToUse) {
      // Generate a random unique code
      const generateCode = async () => {
        const random = `CARD${Math.floor(1000 + Math.random() * 9000)}`;
        const exists = await cardRepository.checkCodeExists(random);
        if (exists) return generateCode();
        return random;
      };
      const code = await generateCode();

      // For monthly cards, calculate the expired date based on durationMonths (default to 1 month if not provided)
      let expiredDate = null;
      if (type === 'Thẻ tháng') {
        const months = parseInt(durationMonths) || 1;
        const start = new Date(startDate);
        start.setMonth(start.getMonth() + months);
        expiredDate = start.toISOString().split('T')[0];
      }

      cardToUse = await cardRepository.insertCard({
        code,
        type,
        created_at: startDate,
        expired_date: expiredDate,
        status: 'Hoạt động',
      });
    }

    // Link to vehicle if plate is provided
    if (cleanPlate) {
      // Check if vehicle with plate exists
      let vehicle = await cardRepository.findVehicleByPlate(cleanPlate);

      if (!vehicle) {
        let customerId = null;

        // If it's a monthly card, create/use customer
        if (type === 'Thẻ tháng') {
          const customer = await cardRepository.insertCustomer({
            full_name: fullName || `Chủ xe ${cleanPlate}`,
            phone: phone || null,
            email: email || null,
            status: 'Hoạt động'
          });
          customerId = customer ? customer.customer_id : null;
          newCustomerId = customerId; // ghi nhớ để rollback nếu cần
        }

        // Fetch first active vehicle type
        const vehicleTypeId = await cardRepository.getFirstVehicleTypeId();

        if (!vehicleTypeId) {
          throw new Error("Không tìm thấy loại xe nào trong hệ thống. Vui lòng cấu hình loại xe trước.");
        }

        // Insert new vehicle
        vehicle = await cardRepository.insertVehicle({
          customer_id: customerId,
          vehicle_type_id: vehicleTypeId,
          plate_number: cleanPlate,
          status: 'Hoạt động'
        });
        newVehicleId = vehicle.vehicle_id; // ghi nhớ để rollback nếu cần
      }

      // Link card to vehicle via card_registrations
      await cardRepository.insertCardRegistration({
        card_id: cardToUse.card_id,
        vehicle_id: vehicle.vehicle_id,
        status: 'Hoạt động',
        created_at: startDate
      });
    }

    return cardToUse;

  } catch (err) {
    // ================================================================
    // ROLLBACK THỦ CÔNG — Xóa các bản ghi đã tạo trong request này
    // ================================================================
    console.error('[createCard] Lỗi trong quá trình tạo thẻ, bắt đầu rollback thủ công:', err.message);

    // Xóa card_registration nếu đã tạo
    if (cardToUse?.card_id) {
      await supabase.from('card_registrations').delete().eq('card_id', cardToUse.card_id).catch(e =>
        console.error('[createCard Rollback] Lỗi xóa card_registrations:', e.message)
      );
      // Xóa card đã tạo
      await supabase.from('card').delete().eq('card_id', cardToUse.card_id).catch(e =>
        console.error('[createCard Rollback] Lỗi xóa card:', e.message)
      );
    }

    // Xóa vehicle nếu được tạo mới trong request này
    if (newVehicleId) {
      await supabase.from('vehicle').delete().eq('vehicle_id', newVehicleId).catch(e =>
        console.error('[createCard Rollback] Lỗi xóa vehicle:', e.message)
      );
    }

    // Xóa customer nếu được tạo mới trong request này
    if (newCustomerId) {
      await supabase.from('customer').delete().eq('customer_id', newCustomerId).catch(e =>
        console.error('[createCard Rollback] Lỗi xóa customer:', e.message)
      );
    }

    // Ném lại lỗi gốc để controller trả về 500
    throw err;
  }
};

export const deleteCard = async (cardId, currentUserId) => {
  // 1. Kiểm tra card tồn tại
  const card = await cardRepository.findById(cardId);
  if (!card) {
    throw new Error("Không tìm thấy card");
  }

  const statusUpper = (card.status || '').toUpperCase();

  // 2. Chặn xóa nếu thẻ đang hoạt động
  if (statusUpper === 'HOẠT ĐỘNG') {
    throw new Error("Không thể xóa card hoạt động");
  }

  // 3. Chặn xóa nếu thẻ đã bị khóa (đã từng xóa mềm trước đó)
  if (statusUpper === 'ĐÃ KHÓA') {
    throw new Error("Không thể xóa thẻ đã khóa");
  }

  // 4. Chỉ còn lại trạng thái "Đang chờ" được phép xóa
  if (statusUpper !== 'ĐANG CHỜ') {
    throw new Error("Chỉ có thể xóa thẻ ở trạng thái Đang chờ");
  }

  // 5. Thực hiện Soft Delete thông qua Repository
  await cardRepository.softDelete(cardId, currentUserId);
  return { success: true };
};


export const updateCard = async (
  cardId,
  payload
) => {

  const {
    plate,
    status,
    checkInTime,
    checkOutTime
  } = payload;

  // =========================
  // Lấy thông tin card
  // =========================

  const card = await cardRepository.getCardById(cardId);

  // TH5
  if (card.status === "Đã khóa") {
    throw new Error(
      "Thẻ đã khóa, không được phép cập nhật"
    );
  }

  let cleanPlate = plate?.trim() || "";

  if (cleanPlate) {

    cleanPlate = cleanPlate
      .replace(/[\s.-]/g, "")
      .toUpperCase();

    const plateRegex =
      /^\d{2}[A-Z]\d{4,5}$/;

    if (!plateRegex.test(cleanPlate)) {
      throw new Error(
        "Biển số xe không đúng định dạng"
      );
    }
  }

  // =========================
  // registration hiện tại
  // =========================

  const registration = await cardRepository.findActiveRegistrationByCardForUpdate(cardId);

  // ==================================================
  // TH4
  // Hoạt động -> Đang chờ
  // clear biển số
  // ==================================================

  if (
    status === "Đang chờ" &&
    registration
  ) {
    await cardRepository.deleteRegistration(registration.registration_id);
    await cardRepository.updateStatus(cardId, "Đang chờ");

    return {
      success: true
    };
  }

  // ==================================================
  // TH2
  // Đang chờ + nhập biển số
  // => Hoạt động
  // ==================================================

  if (
    !registration &&
    cleanPlate
  ) {

    if (!cleanPlate) {
      throw new Error(
        "Vui lòng nhập biển số xe"
      );
    }

    let vehicleId = null;

    const existingVehicle = await cardRepository.findVehicleByPlateAll(cleanPlate);

    if (existingVehicle) {

      const usedReg = await cardRepository.findActiveRegByVehicleIdAll(existingVehicle.vehicle_id);

      if (
        usedReg &&
        usedReg.card_id !== cardId
      ) {
        throw new Error(
          "Biển số đã được sử dụng"
        );
      }

      vehicleId = existingVehicle.vehicle_id;

    } else {

      const vehicleTypeId = await cardRepository.getFirstVehicleTypeId();

      if (!vehicleTypeId) {
        throw new Error("Không tìm thấy loại xe nào trong hệ thống. Vui lòng cấu hình loại xe trước.");
      }

      const newVehicle = await cardRepository.insertVehicle({
        plate_number: cleanPlate,
        vehicle_type_id: vehicleTypeId,
        status: "Hoạt động"
      });

      vehicleId = newVehicle.vehicle_id;
    }

    await cardRepository.insertCardRegistration({
      card_id: cardId,
      vehicle_id: vehicleId,
      status: "Hoạt động"
    });

    await cardRepository.updateStatus(cardId, "Hoạt động");

    return {
      success: true
    };
  }

  // ==================================================
  // TH3
  // Hoạt động nhưng không biển số
  // ==================================================

  if (
    card.status === "Hoạt động" &&
    !registration &&
    !cleanPlate
  ) {
    throw new Error(
      "Thẻ hoạt động bắt buộc phải có biển số"
    );
  }

  // ==================================================
  // TH1
  // Xóa biển số
  // ==================================================

  if (
    registration &&
    !cleanPlate
  ) {
    await cardRepository.deleteRegistration(registration.registration_id);
    await cardRepository.updateStatus(cardId, "Đang chờ");

    return {
      success: true
    };
  }

  // ==================================================
  // Cập nhật biển số
  // ==================================================

  if (
    registration &&
    cleanPlate
  ) {

    const existingVehicle = await cardRepository.findVehicleByPlateAll(cleanPlate);

    if (
      existingVehicle &&
      existingVehicle.vehicle_id !==
      registration.vehicle_id
    ) {

      const activeReg = await cardRepository.findActiveRegByVehicleIdAll(existingVehicle.vehicle_id);

      if (
        activeReg &&
        activeReg.card_id !== cardId
      ) {
        throw new Error(
          "Biển số đã thuộc thẻ khác"
        );
      }

      await cardRepository.updateRegistrationVehicle(
        registration.registration_id,
        existingVehicle.vehicle_id
      );

    } else {

      await cardRepository.updateVehiclePlate(
        registration.vehicle_id,
        cleanPlate
      );
    }

    const session = await cardRepository.getLatestSessionByVehicleId(registration.vehicle_id);

    if (session) {
      await cardRepository.updateParkingSession(session.session_id, {
        plate_number: cleanPlate,
        entry_time: checkInTime || null,
        exit_time: checkOutTime || null
      });
    }

    await cardRepository.updateStatus(
      cardId,
      cleanPlate ? "Hoạt động" : "Đang chờ"
    );
  }

  return {
    success: true
  };
};