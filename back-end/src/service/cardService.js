import supabase from "../config/supabaseClient.js";
import * as cardRepository from "../repositories/cardRepository.js";

export const getCards = async () => {
  const { data: cards, error: cardError } = await supabase
    .from('card')
    .select('card_id, code, type, expired_date, status, created_at')
    .eq('type', 'Thẻ lượt')
    .not('status', 'eq', 'Đã xóa');

  if (cardError) throw new Error(cardError.message);

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map(c => c.card_id);

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
  const { data, error } = await supabase
    .from("payment")
    .select(`
      amount,
      payment_time,
      status,
      parking_order (
        card (code),
        vehicle (
          plate_number,
          customer (full_name)
        )
      )
    `)
    .limit(50);

  if (error) throw new Error(error.message);

  return data.map((item, idx) => {
    const cardCode = item.parking_order?.card?.code || `CARD-${1000 + idx}`;
    const plate = item.parking_order?.vehicle?.plate_number || "Chưa có";
    const owner = item.parking_order?.vehicle?.customer?.full_name || "Khách vãng lai";
    const time = new Date(item.payment_time).toLocaleString('vi-VN');
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
    const status = item.status === 'PAID'
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

export const createCard = async ({ type, startDate, plate, fullName, phone, email, durationMonths }) => {
  const cleanPlate = plate ? plate.trim() : undefined;

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
          card (
            code
          )
        `)
        .eq('vehicle_id', vehicle.vehicle_id)
        .in('status', ['Hoạt động', 'ACTIVE'])
        .maybeSingle();

      if (regCheckErr) throw new Error(regCheckErr.message);

      if (activeReg) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  let cardToUse = null;

  if (type === 'Thẻ lượt') {
    const { data: waitingCard, error: waitingCardErr } = await supabase
      .from('card')
      .select('*')
      .eq('type', 'Thẻ lượt')
      .eq('status', 'Đang chờ')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waitingCardErr) throw new Error(waitingCardErr.message);

    if (waitingCard) {
      const { data: updatedCard, error: updateErr } = await supabase
        .from('card')
        .update({
          status: 'Hoạt động',
          created_at: startDate || new Date().toISOString()
        })
        .eq('card_id', waitingCard.card_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);
      cardToUse = updatedCard;
    }
  }

  if (!cardToUse) {
    const generateCode = async () => {
      const random = `CARD${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: existing } = await supabase.from('card').select('code').eq('code', random).maybeSingle();
      if (existing) return generateCode();
      return random;
    };
    const code = await generateCode();

    let expiredDate = null;
    if (type === 'Thẻ tháng') {
      const months = parseInt(durationMonths) || 1;
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + months);
      expiredDate = start.toISOString().split('T')[0];
    }

    const { data: newCard, error: cardError } = await supabase
      .from('card')
      .insert({
        code,
        type,
        created_at: startDate,
        expired_date: expiredDate,
        status: 'Hoạt động',
      })
      .select()
      .single();

    if (cardError) throw new Error(cardError.message);
    cardToUse = newCard;
  }

  if (plate) {
    let { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', plate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    if (!vehicle) {
      let customerId = null;

      if (type === 'Thẻ tháng') {
        const { data: customer, error: custErr } = await supabase
          .from('customer')
          .insert({
            full_name: fullName || `Chủ xe ${plate}`,
            phone: phone || null,
            email: email || null,
            status: 'Hoạt động'
          })
          .select()
          .single();

        if (custErr) throw new Error(custErr.message);
        customerId = customer ? customer.customer_id : null;
      }

      const { data: vtList, error: vtErr } = await supabase
        .from('vehicle_type')
        .select('vehicle_type_id')
        .limit(1);

      if (vtErr) throw new Error(vtErr.message);
      const vehicleTypeId = vtList && vtList.length > 0 ? vtList[0].vehicle_type_id : null;

      if (!vehicleTypeId) {
        throw new Error("Không tìm thấy loại xe nào trong hệ thống. Vui lòng cấu hình loại xe trước.");
      }

      const { data: newVehicle, error: insertVehErr } = await supabase
        .from('vehicle')
        .insert({
          customer_id: customerId,
          vehicle_type_id: vehicleTypeId,
          plate_number: plate,
          status: 'Hoạt động'
        })
        .select()
        .single();

      if (insertVehErr) throw new Error(insertVehErr.message);
      vehicle = newVehicle;
    }

    const { error: regErr } = await supabase
      .from('card_registrations')
      .insert({
        card_id: cardToUse.card_id,
        vehicle_id: vehicle.vehicle_id,
        status: 'ACTIVE',
        created_at: startDate
      });

    if (regErr) throw new Error(regErr.message);
  }

  return cardToUse;
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
  const cleanPlate = plate ? plate.trim() : undefined;

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

  await supabase
    .from("card")
    .update({ status })
    .eq("card_id", cardId);

  // tìm xe của thẻ
  const { data: registration } = await supabase
    .from("card_registrations")
    .select("vehicle_id")
    .eq("card_id", cardId)
    .in("status", ["ACTIVE", "Hoạt động"])
    .maybeSingle();

  if (!registration) {
    return {
      success: true,
      message: "Thẻ chưa đăng ký xe"
    };
  }

  // cập nhật biển số
  await supabase
    .from("vehicle")
    .update({
      plate_number: cleanPlate
    })
    .eq(
      "vehicle_id",
      registration.vehicle_id
    );

  // lấy session mới nhất
  const { data: session } = await supabase
    .from("parking_sessions")
    .select("session_id")
    .eq(
      "vehicle_id",
      registration.vehicle_id
    )
    .order(
      "entry_time",
      { ascending: false }
    )
    .limit(1)
    .maybeSingle();

  if (session) {

    await supabase
      .from("parking_sessions")
      .update({
        plate_number: cleanPlate,
        entry_time: checkInTime || null,
        exit_time: checkOutTime || null
      })
      .eq(
        "session_id",
        session.session_id
      );
  }

  return {
    success: true
  };
};
>>>>>>> OperationLog
