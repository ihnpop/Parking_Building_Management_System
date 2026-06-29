import supabase from "./src/config/supabaseClient.js";

async function run() {
  try {
    console.log("=== DANH SÁCH TÀI KHOẢN TRONG HỆ THỐNG ===");
    // Query profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) throw error;

    for (const p of profiles) {
      console.log(`Tên: ${p.full_name} | Role: ${p.role} | ID: ${p.id}`);
    }

    // Query auth users if possible via admin api, but since we are client, 
    // let's query any profiles/logs that might mention emails.
    // Let's also check if there is a 'user' or 'customer' table.
    const { data: customers } = await supabase.from('customer').select('*').limit(5);
    console.log("\n=== CUSTOMERS ===");
    customers?.forEach(c => {
      console.log(`Cust: ${c.full_name} | Email: ${c.email}`);
    });

  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    process.exit(0);
  }
}

run();
