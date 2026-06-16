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
    .like("type", "Thẻ tháng");

  if (error) throw new Error(error.message);

  const { data: cards, error: cardError } = await supabase
    .from("card")
    .select("*")
    .like("type", "Thẻ tháng");

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


export const getLostCards = async () => {
  // 1. Thực hiện truy vấn kết nối tầng từ bảng card_lost_log
  const { data, error } = await supabase
    .from('card_lost_log')
    .select(`
      lost_report_id,
      reported_at,
      status,
      description,
      handled_by,
      card ( code ),
      vehicle (
        plate_number,
        customer ( full_name )
      ),
      profiles ( full_name )
    `)
    .order('reported_at', { ascending: false });

  if (error) {
    console.error("Lỗi khi truy vấn nhật ký mất thẻ:", error);
    throw new Error(error.message);
  }

  // 2. Chuẩn hóa và làm phẳng cấu trúc dữ liệu JSON trả về
  return data.map((log, idx) => {
    const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;
    const cardCode = log.card?.code || "Không rõ";
    const plateNumber = log.vehicle?.plate_number || "Chưa có xe";
    const customerName = log.vehicle?.customer?.full_name || "Khách vãng lai";

    // Nếu rỗng (NULL - Chờ xử lý) thì hiển thị gạch ngang thanh lịch "---"
    const handlerName = log.profiles?.full_name || "---";

    // PHÂN LOẠI CHÍNH XÁC THÀNH 3 TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
    let statusText = 'Đang xử lý';
    if (log.status === 'RESOLVED' || log.status === 'Đã xử lý xong' || log.status === 'Đã xong') {
      statusText = 'Đã xong';
    } else if (log.status === 'PENDING' || !log.status) {
      // Nếu trạng thái trong DB là PENDING và chưa có người xử lý (handled_by là null) -> Chờ xử lý
      if (!log.handled_by) {
        statusText = 'Chờ xử lý';
      } else {
        statusText = 'Đang xử lý';
      }
    } else if (log.status === 'CANCELED' || log.status === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    }

    return {
      // Khớp hoàn toàn cả định dạng trường cũ (Dự phòng cho UI)
      id: reportId,
      cardNo: cardCode,
      plate: plateNumber,
      owner: customerName,
      date: log.reported_at,
      handler: handlerName,

      // Khớp hoàn toàn định dạng trường phẳng mới
      lost_report_id: reportId,
      card_code: cardCode,
      plate_number: plateNumber,
      customer_name: customerName,
      reported_at: log.reported_at,
      handler_name: handlerName,

      status: statusText // Trả về chuẩn: 'Chờ xử lý', 'Đang xử lý', hoặc 'Đã xong'
    };
  });
};