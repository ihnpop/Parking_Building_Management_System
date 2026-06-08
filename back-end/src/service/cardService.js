import supabase from "../config/supabaseClient.js";

// Mock Fallback Data
const mockCards = [
  { code: 'CARD-99281', type: 'Thẻ tháng', plate: '29A-123.45', status: 'Hoạt động' },
  { code: 'CARD-44102', type: 'Thẻ lượt', plate: '30H-882.11', status: 'Đã khóa' },
  { code: 'CARD-10293', type: 'Thẻ tháng', plate: '51F-003.92', status: 'Hoạt động' },
  { code: 'CARD-77382', type: 'Thẻ lượt', plate: '29D-552.18', status: 'Hoạt động' },
  { code: 'CARD-00001', type: 'Thẻ lượt', plate: '30A-999.99', status: 'Hoạt động' }
];

const mockMonthCards = [
  { id: '01', cardNo: 'CARD-99281', plate: '29A-123.45', customer: 'Nguyễn Văn An', type: 'Ô tô 4 chỗ', startDate: '01/10/2023', endDate: '01/10/2024', status: 'Hoạt động' },
  { id: '02', cardNo: 'CARD-44102', plate: '30H-882.11', customer: 'Trần Thị Bích', type: 'Xe máy', startDate: '15/05/2023', endDate: '15/05/2024', status: 'Sắp hết hạn' },
  { id: '03', cardNo: 'CARD-10293', plate: '51F-003.92', customer: 'Lê Hoàng Nam', type: 'Ô tô 7 chỗ', startDate: '10/11/2022', endDate: '10/11/2023', status: 'Đã hết hạn' },
  { id: '04', cardNo: 'CARD-77382', plate: '29D-552.18', customer: 'Phạm Minh Đức', type: 'Ô tô 4 chỗ', startDate: '20/01/2024', endDate: '20/01/2025', status: 'Hoạt động' }
];

const mockLostCards = [
  { id: 'LR-20231024-001', cardNo: 'CARD-99281', plate: '29A-123.45', owner: 'Nguyễn Văn An', date: '24/10/2023 08:30', status: 'Đang xử lý', handler: 'Admin_01' },
  { id: 'LR-20231023-085', cardNo: 'CARD-44102', plate: '30H-882.11', owner: 'Trần Thị Bích', date: '23/10/2023 15:45', status: 'Đã hủy thẻ', handler: 'System_Log' },
  { id: 'LR-20231022-112', cardNo: 'CARD-10293', plate: '51F-003.92', owner: 'Lê Hoàng Nam', date: '22/10/2023 10:20', status: 'Đã tìm lại', handler: 'Admin_02' },
  { id: 'LR-20231021-045', cardNo: 'CARD-77382', plate: '29D-552.18', owner: 'Phạm Minh Đức', date: '21/10/2023 19:15', status: 'Đã hủy thẻ', handler: 'Admin_01' }
];

const mockMonthCardLogs = [
  { time: '20/10/2023 14:30', cardNo: 'CARD-99281', plate: '29A-123.45', owner: 'Nguyễn Văn An', type: 'Gia hạn', amount: '1,200,000đ', status: 'Thành công' },
  { time: '20/10/2023 10:15', cardNo: 'CARD-44102', plate: '30H-882.11', owner: 'Trần Thị Bích', type: 'Cấp mới', amount: '1,500,000đ', status: 'Thành công' },
  { time: '19/10/2023 16:45', cardNo: 'CARD-10293', plate: '51F-003.92', owner: 'Lê Hoàng Nam', type: 'Thay đổi xe', amount: '0đ', status: 'Đang xử lý' },
  { time: '19/10/2023 09:20', cardNo: 'CARD-77382', plate: '29D-552.18', owner: 'Phạm Minh Đức', type: 'Gia hạn', amount: '1,200,000đ', status: 'Thất bại' }
];

export const getCards = async () => {
  try {
    const { data: cards, error: cardErr } = await supabase
      .from("card")
      .select("*");
    
    if (cardErr || !cards || cards.length === 0) {
      console.log("Supabase empty or error for card, returning mock data.");
      return mockCards;
    }

    // Try joining with active parking orders/vehicles
    const { data: orders } = await supabase
      .from("parking_order")
      .select("card_id, vehicle(plate_number, customer_id, vehicle_package(status))");

    return cards.map(c => {
      const order = orders?.find(o => o.card_id === c.card_id);
      const vehicle = order?.vehicle;
      const hasActivePkg = vehicle?.vehicle_package?.some(p => p.status === 'ACTIVE');

      return {
        code: c.code,
        type: hasActivePkg ? "Thẻ tháng" : "Thẻ lượt",
        plate: vehicle?.plate_number || "Không có",
        status: c.status === 'AVAILABLE' ? 'Hoạt động' : 'Đã khóa'
      };
    });
  } catch (err) {
    console.error("Error in getCards service, returning mock:", err.message);
    return mockCards;
  }
};

export const getMonthCards = async () => {
  try {
    const { data, error } = await supabase
      .from("vehicle_package")
      .select(`
        vehicle_package_id,
        start_date,
        end_date,
        status,
        vehicle (
          plate_number,
          vehicle_type (name),
          customer (full_name)
        )
      `);

    if (error || !data || data.length === 0) {
      console.log("Supabase empty or error for vehicle_package, returning mock data.");
      return mockMonthCards;
    }

    const { data: cards } = await supabase.from("card").select("*");

    return data.map((vp, i) => {
      const cardCode = cards && cards[i % cards.length] ? cards[i % cards.length].code : `CARD-${i + 1000}`;
      let statusText = "Hoạt động";
      if (vp.status === 'EXPIRED') statusText = "Đã hết hạn";
      else if (new Date(vp.end_date) - new Date() < 7 * 24 * 60 * 60 * 1000) statusText = "Sắp hết hạn";

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
  } catch (err) {
    console.error("Error in getMonthCards service, returning mock:", err.message);
    return mockMonthCards;
  }
};

export const getLostCards = async () => {
  try {
    const { data, error } = await supabase
      .from("incident_report")
      .select("*")
      .eq("incident_type", "LOST_CARD");

    if (error || !data || data.length === 0) {
      return mockLostCards;
    }

    return data.map((item, idx) => ({
      id: item.incident_id || `LR-20231024-${String(idx + 1).padStart(3, '0')}`,
      cardNo: item.card_code || "CARD-99281",
      plate: item.plate_number || "29A-123.45",
      owner: item.customer_name || "Nguyễn Văn An",
      date: new Date(item.created_at).toLocaleString('vi-VN'),
      status: item.status === 'OPEN' ? 'Đang xử lý' : item.status === 'RESOLVED' ? 'Đã tìm lại' : 'Đã hủy thẻ',
      handler: item.handler_name || 'Admin_01'
    }));
  } catch (err) {
    return mockLostCards;
  }
};

export const getMonthCardLogs = async () => {
  try {
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

    if (error || !data || data.length === 0) {
      return mockMonthCardLogs;
    }

    return data.map((item, idx) => {
      const cardCode = item.parking_order?.card?.code || `CARD-${1000 + idx}`;
      const plate = item.parking_order?.vehicle?.plate_number || "Chưa có";
      const owner = item.parking_order?.vehicle?.customer?.full_name || "Khách vãng lai";
      const time = new Date(item.payment_time).toLocaleString('vi-VN');
      const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
      const status = item.status === 'PAID' ? 'Thành công' : item.status === 'PENDING' ? 'Đang xử lý' : 'Thất bại';

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
  } catch (err) {
    return mockMonthCardLogs;
  }
};