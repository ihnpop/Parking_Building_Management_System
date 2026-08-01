// Import hàm createClient từ thư viện Supabase JS SDK để khởi tạo client kết nối Supabase
import { createClient } from "@supabase/supabase-js";
// import dotenv from "dotenv";      // (đã comment) — không dùng dotenv ở frontend Vite
// dotenv.config();                  // (đã comment) — Vite tự load biến môi trường qua import.meta.env

// Đọc URL dự án Supabase từ biến môi trường Vite (.env → VITE_SUPABASE_URL)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Đọc Anon Key (public key) của Supabase từ biến môi trường Vite (.env → VITE_SUPABASE_ANON_KEY)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra xem hai biến môi trường có tồn tại không; nếu thiếu sẽ gây lỗi 401 / crash khi gọi API
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables in frontend!");
}

// Khởi tạo instance Supabase client với các tùy chọn xác thực
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Bật tính năng tự động detect session từ URL fragment (#) để Supabase lấy token khi Google Redirect về
        detectSessionInUrl: true,
        // Lưu trữ phiên đăng nhập vào localStorage để duy trì qua các lần reload trang
        persistSession: true,
        // Tự động gia hạn token khi gần hết hạn để tránh bị đăng xuất đột ngột
        autoRefreshToken: true,
    }
});

// Export client Supabase để dùng trong toàn bộ dự án (AuthContext, các API file, ...)
export default supabase;
