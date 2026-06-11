import supabase from "../config/supabaseClient.js";

export const getCards = async () => {
  const { data, error } = await supabase
    .from('card')
    .select('*');

  if (error) throw new Error(error.message);
  return data;
};

export const getMonthCards = async () => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .like("type", "Thẻ Tháng")

  if (error) throw new Error(error.message);

  const { data: cards, error: cardError } = await supabase
    .from("card")
    .select("*");

  if (cardError) throw new Error(cardError.message);

  return data.map((vp, i) => {
    const cardCode = cards && cards[i % cards.length]
      ? cards[i % cards.length].code
      : `CARD-${i + 1000}`;

    let statusText = "Hoạt động";
    if (vp.status === 'EXPIRED') {
      statusText = "Đã hết hạn";
    } else if (new Date(vp.end_date) - new Date() < 7 * 24 * 60 * 60 * 1000) {
      statusText = "Sắp hết hạn";
    }

    return {
      id: String(i + 1).padStart(2, '0'),
      cardNo: cardCode,
      plate: vp.vehicle?.plate_number || "Chưa có",
      customer: vp.vehicle?.customer?.full_name || "Khách vãng lai",
      type: vp.vehicle?.vehicle_type?.name || "Xe máy",
      startDate: new Date(vp.start_date).toLocaleDateString('vi-VN'),
      endDate: new Date(vp.end_date).toLocaleDateString('vi-VN'),
      status: statusText
    };
  });
};

export const getLostCards = async () => {
  const { data, error } = await supabase
    .from("incident_report")
    .select("*")
    .eq("incident_type", "LOST_CARD");

  if (error) throw new Error(error.message);

  return data.map((item, idx) => ({
    id: item.incident_id || `LR-${String(idx + 1).padStart(3, '0')}`,
    cardNo: item.card_code || "N/A",
    plate: item.plate_number || "N/A",
    owner: item.customer_name || "N/A",
    date: new Date(item.created_at).toLocaleString('vi-VN'),
    status: item.status === 'OPEN'
      ? 'Đang xử lý'
      : item.status === 'RESOLVED'
        ? 'Đã tìm lại'
        : 'Đã hủy thẻ',
    handler: item.handler_name || 'N/A'
  }));
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