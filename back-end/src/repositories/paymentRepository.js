import supabase from "../config/supabaseClient.js"; // sửa đúng đường dẫn thật của bạn

export async function create(data) {
    const { data: result, error } = await supabase
        .from("payment")
        .insert(data)
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function findByOrderCode(orderCode) {
    const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("order_code", orderCode)
        .single();
    if (error) throw error;
    return data;
}

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