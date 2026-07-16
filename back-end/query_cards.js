import supabase from "./src/config/supabaseClient.js";

async function run() {
  try {
    console.log("=== DANH SÁCH THẺ THÁNG ===");
    const { data: cards, error } = await supabase
      .from('card')
      .select('card_id, code, type, expired_date, status, created_at')
      .eq('type', 'Thẻ tháng')
      .not('status', 'eq', 'Đã xóa')
      .order('created_at', { ascending: false });

    if (error) throw error;

    cards.forEach((c, idx) => {
      console.log(`STT: ${idx + 1} | Mã: ${c.code} | Trạng thái: ${c.status} | Created At: ${c.created_at} | Expired: ${c.expired_date}`);
    });

  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    process.exit(0);
  }
}

run();
