import supabase from "./src/config/supabaseClient.js";

async function run() {
  try {
    console.log("=== CẬP NHẬT THỬ NGHIỆM THẺ MONTH0031 ===");
    const { data, error } = await supabase
      .from('card')
      .update({ created_at: new Date().toISOString() })
      .eq('code', 'MONTH0031')
      .select();

    if (error) throw error;
    console.log("Cập nhật thành công:", data);

  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    process.exit(0);
  }
}

run();
