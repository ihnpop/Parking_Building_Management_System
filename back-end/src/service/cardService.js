import * as cardRepository from "../repositories/cardRepository.js";
import * as lostCardRepository from "../repositories/lostCardRepository.js";

export const getCards = async () => {
  const cards = await cardRepository.getCardsWithType('Thẻ lượt');

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map(c => c.card_id);

<<<<<<< HEAD
  const { data: registrations, error: regError } = await supabase
    .from('card_registrations')
    .select(`
      card_id,
      status,
      registration_id,
      vehicle (
        vehicle_id,
        plate_number,
        customer (
          customer_id,
          full_name,
          phone,
          email
        )
      )
    `)
    .in('card_id', cardIds);

  if (regError) throw new Error(regError.message);
=======
  const registrations = await cardRepository.getRegistrationsByCardIds(cardIds);
>>>>>>> origin/OperationLog3

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
      const activeReg = cardRegs.find(r => r.status === 'Hoạt động' || r.status === 'ACTIVE') ?? null;

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
        customer_id: activeReg?.vehicle?.customer?.customer_id || null,
        registration_id: activeReg?.registration_id || null
      };
    })
  );
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
    .not("status", "eq", "Đã xóa");

  if (error) throw new Error(error.message);

  return await Promise.all(
    data.map(async (card, i) => {
      const activeReg = card.card_registrations?.find(r => r.status === 'Hoạt động' || r.status === 'ACTIVE') || null;

      let statusText = "Hoạt động";
      const expiredDate = card.expired_date ? new Date(card.expired_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (card.status === 'Hết hạn' || card.status === 'Đã hết hạn' || card.status === 'EXPIRED' || (expiredDate && expiredDate < today)) {
        statusText = "Đã hết hạn";
      } else if (card.status === 'Đã khóa' || card.status === 'LOCKED') {
        statusText = "Đã khóa";
      } else if (expiredDate) {
        expiredDate.setHours(0, 0, 0, 0);
        const diffTime = expiredDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          statusText = "Sắp hết hạn";
        }
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
          .eq("vehicle_id", activeReg.vehicle.vehicle_id)
          .order("entry_time", { ascending: false })
          .limit(1);

        latestSession = sessions?.[0] || null;
      }

      return {
        id: String(i + 1).padStart(2, '0'),
        card_id: card.card_id,
        registrationId: activeReg?.registration_id || null,
        cardNo: card.code,
        plate: activeReg?.vehicle?.plate_number || "Chưa có",
        customer: activeReg?.vehicle?.customer?.full_name || "Khách vãng lai",
        phone: activeReg?.vehicle?.customer?.phone || "",
        email: activeReg?.vehicle?.customer?.email || "",
        type: activeReg?.vehicle?.vehicle_type?.name || "Xe máy",
        startDate: card.created_at ? new Date(card.created_at).toLocaleDateString('vi-VN') : "Chưa có",
        endDate: card.expired_date ? new Date(card.expired_date).toLocaleDateString('vi-VN') : "Không giới hạn",
        expiredDate: card.expired_date,
        status: statusText,
        check_in_time: latestSession?.entry_time || '',
        check_out_time: latestSession?.exit_time || ''
      };
    })
  );
};

export const getLostCards = async () => {
  const { data, error } = await supabase
    .from('card_lost_log')
    .select(`
      lost_report_id,
      reported_at,
      status,
      description,
      handled_by,
      card ( code, type ),
      vehicle (
        plate_number,
        customer ( full_name )
      ),
      profiles ( full_name )
    `)
    .order('reported_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((log, idx) => {
    const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;
    const cardCode = log.card?.code || "Không rõ";
    const plateNumber = log.vehicle?.plate_number || "Chưa có xe";
    const cardType = log.card?.type || "Thẻ lượt";
    const handlerName = log.profiles?.full_name || "---";

    let statusText = 'Đang xử lý'; 
    if (log.status === 'RESOLVED' || log.status === 'Đã xử lý xong' || log.status === 'Đã xong') {
      statusText = 'Đã xong';
    } else if (log.status === 'CANCELED' || log.status === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    } else if (log.status === 'PENDING' || log.status === 'Chờ xử lý' || !log.status) {
      if (!log.handled_by) {
        statusText = 'Chờ xử lý';
      } else {
        statusText = 'Đang xử lý';
      }
    }

    return {
      id: reportId,
      cardNo: cardCode,
      plate: plateNumber,
      card_type: cardType,
      owner: log.vehicle?.customer?.full_name || "Khách vãng lai",
      date: log.reported_at,
      handler: handlerName,

      lost_report_id: reportId,
      card_code: cardCode,
      plate_number: plateNumber,
      reported_at: log.reported_at,
      handler_name: handlerName,
      status: statusText
    };
  });
};

export const getMonthCardLogs = async () => {
  const data = await cardRepository.getPaymentLogs();

  return data.map((item, idx) => {
    const cardCode = item.parking_order?.card?.code || `CARD-${1000 + idx}`;
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
      cardNo: cardCode,
      plate,
      owner,
      type: item.amount > 500000 ? 'Gia hạn' : 'Cấp mới',
      amount,
      status
    };
  });
};

<<<<<<< HEAD
export const createCard = async ({ type, startDate, plate, fullName, phone, email, durationMonths }) => {
  const cleanPlate = plate ? plate.trim() : undefined;
=======


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
>>>>>>> origin/OperationLog_UXUI

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
<<<<<<< HEAD
  if (type === 'Thẻ lượt') {
    // Tìm thẻ lượt có trạng thái "Đang chờ" để tái sử dụng
    const waitingCard = await cardRepository.findWaitingCard(type);

    if (waitingCard) {
      // Trường hợp 1: Tái sử dụng thẻ đang chờ, cập nhật lại trạng thái và ngày tạo
      cardToUse = await cardRepository.reuseWaitingCard(waitingCard.card_id, startDate);
    }
  }

  if (!cardToUse) {
    const generateCode = async () => {
      const random = `CARD${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = await cardRepository.checkCodeExists(random);
      if (exists) return generateCode();
      return random;
    };
    const code = await generateCode();

    let expiredDate = null;
    if (type === 'Thẻ tháng') {
      const months = parseInt(durationMonths) || 1;
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + months);
      expiredDate = start.toISOString().split('T')[0];
=======
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
>>>>>>> origin/OperationLog_UXUI
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

<<<<<<< HEAD
  // Link to vehicle if plate is provided
  if (cleanPlate) {
    // Check if vehicle with plate exists
    let vehicle = await cardRepository.findVehicleByPlate(cleanPlate);

    if (!vehicle) {
      let customerId = null;

=======
      // For monthly cards, calculate the expired date based on durationMonths (default to 1 month if not provided)
      let expiredDate = null;
>>>>>>> origin/OperationLog_UXUI
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

<<<<<<< HEAD
    // Link card to vehicle via card_registrations
    await cardRepository.insertCardRegistration({
      card_id: cardToUse.card_id,
      vehicle_id: vehicle.vehicle_id,
      status: 'Hoạt động',
      created_at: startDate
    });
  }
  }
=======
    // Link to vehicle if plate is provided
    if (cleanPlate) {
      // Check if vehicle with plate exists
      let vehicle = await cardRepository.findVehicleByPlate(cleanPlate);
>>>>>>> origin/OperationLog_UXUI

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
  const card = await cardRepository.findById(cardId);
  if (!card) {
    throw new Error("Card not found");
  }

  const statusUpper = (card.status || '').toUpperCase();

  if (statusUpper === 'HOẠT ĐỘNG') {
    throw new Error("Không thể xóa card hoạt động");
  }

  if (statusUpper === 'ĐÃ KHÓA') {
    throw new Error("Không thể xóa thẻ đã khóa");
  }

  if (statusUpper !== 'ĐANG CHỜ') {
    throw new Error("Chỉ có thể xóa thẻ ở trạng thái Đang chờ");
  }

  await cardRepository.softDelete(cardId, currentUserId);
  return { success: true };
};

export const createLostCard = async ({ plate_number, description }) => {
  if (!plate_number) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  const { data: vehicle, error: vehicleErr } = await supabase
    .from('vehicle')
    .select('vehicle_id')
    .eq('plate_number', plate_number)
    .maybeSingle();

  if (vehicleErr) {
    throw new Error(vehicleErr.message);
  }
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe có biển số ${plate_number}`);
  }

  let finalCardId = null;

  const { data: activeReg, error: activeErr } = await supabase
    .from('card_registrations')
    .select('card_id')
    .eq('vehicle_id', vehicle.vehicle_id)
    .in('status', ['ACTIVE', 'Hoạt động'])
    .limit(1)
    .maybeSingle();

  if (activeErr) {
    throw new Error(activeErr.message);
  }

  if (activeReg) {
    finalCardId = activeReg.card_id;
  } else {
    const { data: anyReg, error: anyErr } = await supabase
      .from('card_registrations')
      .select('card_id')
      .eq('vehicle_id', vehicle.vehicle_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyErr) {
      throw new Error(anyErr.message);
    }
    if (anyReg) {
      finalCardId = anyReg.card_id;
    }
  }

  if (!finalCardId) {
    const { data: order, error: orderErr } = await supabase
      .from('parking_order')
      .select('card_id')
      .eq('vehicle_id', vehicle.vehicle_id)
      .not('card_id', 'is', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderErr) {
      throw new Error(orderErr.message);
    }
    if (order) {
      finalCardId = order.card_id;
    }
  }

  if (!finalCardId) {
    throw new Error(`Xe biển số ${plate_number} chưa được gắn thẻ nào trong hệ thống. Vui lòng đăng ký thẻ trước.`);
  }

  const { data: cardObj, error: cardErr } = await supabase
    .from('card')
    .select('type')
    .eq('card_id', finalCardId)
    .maybeSingle();

  if (cardErr) {
    throw new Error(cardErr.message);
  }

  const isDailyCard = !cardObj || cardObj.type !== 'Thẻ tháng';

  if (isDailyCard) {
    const { error: updateErr } = await supabase
      .from('vehicle')
      .update({ customer_id: null })
      .eq('vehicle_id', vehicle.vehicle_id);

    if (updateErr) {
      console.error("Lỗi khi cập nhật customer_id thành null cho thẻ lượt:", updateErr.message);
    }
  }

  const { data, error } = await supabase
    .from('card_lost_log')
    .insert({
      card_id: finalCardId,
      vehicle_id: vehicle.vehicle_id,
      description: description || "Báo mất thẻ",
      reported_at: new Date().toISOString(),
      status: 'PENDING',
      handled_by: null
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getLostCardLogs = getLostCards;

export const updateCard = async (cardId, payload) => {
  const { plate, status, checkInTime, checkOutTime } = payload;

  // =========================
  // Lấy thông tin card
  // =========================
  const card = await cardRepository.getCardById(cardId);

  // TH5
  if (card && card.status === "Đã khóa") {
    throw new Error(
      "Thẻ đã khóa, không được phép cập nhật"
    );
  }

  let cleanPlate = plate?.trim() || "";

  if (cleanPlate) {
    const vehicle = await cardRepository.findVehicleByPlate(cleanPlate);

    if (vehicle) {
      const activeReg = await cardRepository.findActiveRegByVehicleId(vehicle.vehicle_id);

      if (activeReg && activeReg.card_id !== cardId) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  await cardRepository.updateStatus(cardId, status);

  const registration = await cardRepository.findActiveRegistrationByCardForUpdate(cardId);

  // ==================================================
  // TH4
  // Hoạt động -> Đang chờ
  // clear biển số
  // ==================================================
  if (status === "Đang chờ" && registration) {
    await cardRepository.deleteRegistration(registration.registration_id);
    await cardRepository.updateStatus(cardId, "Đang chờ");
    return {
      success: true,
      message: "Thẻ chưa đăng ký xe"
    };
  }

  // ==================================================
  // TH2
  // Đang chờ + nhập biển số
  // => Hoạt động
  // ==================================================
  if (!registration && cleanPlate) {
    if (!cleanPlate) {
      throw new Error(
        "Vui lòng nhập biển số xe"
      );
    }

    let vehicleId = null;
    const existingVehicle = await cardRepository.findVehicleByPlateAll(cleanPlate);

    if (existingVehicle) {
      const usedReg = await cardRepository.findActiveRegByVehicleIdAll(existingVehicle.vehicle_id);

      if (usedReg && usedReg.card_id !== cardId) {
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
  if (card && card.status === "Hoạt động" && !registration && !cleanPlate) {
    throw new Error(
      "Thẻ hoạt động bắt buộc phải có biển số"
    );
  }

  // ==================================================
  // TH1
  // Xóa biển số
  // ==================================================
  if (registration && !cleanPlate) {
    await cardRepository.deleteRegistration(registration.registration_id);
    await cardRepository.updateStatus(cardId, "Đang chờ");

    return {
      success: true
    };
  }

  // ==================================================
  // Cập nhật biển số
  // ==================================================
  if (registration && cleanPlate) {
    const existingVehicle = await cardRepository.findVehicleByPlateAll(cleanPlate);

    if (existingVehicle && existingVehicle.vehicle_id !== registration.vehicle_id) {
      const activeReg = await cardRepository.findActiveRegByVehicleIdAll(existingVehicle.vehicle_id);

      if (activeReg && activeReg.card_id !== cardId) {
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
