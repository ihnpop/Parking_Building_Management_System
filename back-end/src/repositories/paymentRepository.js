/**
 * paymentRepository.js
 * Lớp truy xuất cơ sở dữ liệu (Repository) cho thực thể Hóa đơn thanh toán (payment table).
 * Làm việc trực tiếp với Supabase Client để tạo mới, truy vấn, và cập nhật giao dịch.
 */

import supabase from "../config/supabaseClient.js";

/**
 * Thêm mới một bản ghi hóa đơn tạm (trạng thái 'Chờ thanh toán') vào bảng payment
 */
export async function create(data) {
    const { data: result, error } = await supabase
        .from("payment")
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

/**
 * Tìm kiếm chi tiết thông tin hóa đơn bằng mã đơn hàng duy nhất (order_code)
 */
export async function findByOrderCode(orderCode) {
    const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("order_code", orderCode)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Cập nhật trạng thái và kết quả giao dịch thực tế sau khi nhận thông tin phản hồi từ cổng VNPay
 */
export async function updateStatus(orderCode, updates) {
    const { data, error } = await supabase
        .from("payment")
        .update(updates)
        .eq("order_code", orderCode)
        .select()
        .single();
    if (error) throw error;
    return data;
}