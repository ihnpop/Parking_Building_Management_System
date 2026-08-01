import supabase from "../config/supabaseClient.js";
import { config } from "../config/config.js";

/**
 * Lấy thông tin profile kèm tòa nhà của user
 * @param {string} userId
 */
export const getManagerBuildingProfile = async (userId) => {
    const { data, error } = await supabase
        .from("profiles")
        .select(`
            id,
            building_id,
            building:building_id (
                building_id,
                name,
                address
            )
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error) throw new Error("Lỗi khi lấy thông tin tòa nhà của tài khoản: " + error.message);
    return data;
};

/**
 * Lấy bãi đỗ xe thuộc tòa nhà
 * @param {string} buildingId
 */
export const getParkingByBuildingId = async (buildingId) => {
    const { data, error } = await supabase
        .from("parking")
        .select("parking_id, name")
        .eq("building_id", buildingId)
        .limit(1);

    if (error) throw new Error("Lỗi khi lấy thông tin bãi xe: " + error.message);
    return data && data.length > 0 ? data[0] : null;
};

/**
 * Lấy hoặc tạo mới bảng giá active cho parking
 * @param {string} parkingId
 * @param {string} buildingName
 */
export const getOrCreateActivePriceTable = async (parkingId, buildingName = "") => {
    // 1. Tìm bảng giá đang hoạt động
    const { data: existing, error: findErr } = await supabase
        .from("price_table")
        .select("price_table_id, name, status, card_reissue_fee")
        .eq("parking_id", parkingId)
        .eq("status", "Hoạt động")
        .limit(1);

    if (findErr) throw new Error("Lỗi tìm bảng giá: " + findErr.message);

    if (existing && existing.length > 0) {
        return existing[0];
    }

    // 2. Nếu chưa có, tạo bảng giá mặc định
    const tableName = `Bảng giá ${buildingName || "Tòa nhà"}`;
    const { data: created, error: createErr } = await supabase
        .from("price_table")
        .insert({
            parking_id: parkingId,
            name: tableName,
            description: `Bảng giá áp dụng cho ${buildingName}`,
            status: "Hoạt động",
            card_reissue_fee: config.defaultCardReissueFee,
        })
        .select()
        .single();

    if (createErr) throw new Error("Lỗi tạo bảng giá mặc định: " + createErr.message);
    return created;
};

/**
 * Cập nhật phí cấp lại/làm lại thẻ trong bảng giá
 * @param {string} priceTableId
 * @param {number} cardReissueFee
 */
export const updateCardReissueFee = async (priceTableId, cardReissueFee) => {
    const { data, error } = await supabase
        .from("price_table")
        .update({ card_reissue_fee: cardReissueFee })
        .eq("price_table_id", priceTableId)
        .select();

    if (error) throw new Error("Lỗi cập nhật phí cấp lại thẻ: " + error.message);
    return data;
};

/**
 * Lấy tất cả loại xe
 */
export const getVehicleTypes = async () => {
    const { data, error } = await supabase
        .from("vehicle_type")
        .select("vehicle_type_id, name, status")
        .eq("status", "Hoạt động");

    if (error) throw new Error("Lỗi lấy danh sách loại xe: " + error.message);
    return data || [];
};

/**
 * Lấy các dòng giá lượt (price_item) theo price_table_id
 * @param {string} priceTableId
 */
export const getPriceItemsByTable = async (priceTableId) => {
    const { data, error } = await supabase
        .from("price_item")
        .select(`
            price_item_id,
            price_table_id,
            vehicle_type_id,
            min_hour,
            max_hour,
            price,
            vehicle_type:vehicle_type_id (
                vehicle_type_id,
                name
            )
        `)
        .eq("price_table_id", priceTableId);

    if (error) throw new Error("Lỗi lấy chi tiết giá lượt: " + error.message);
    return data || [];
};

/**
 * Lấy các gói giá tháng (monthly_package) theo price_table_id
 * @param {string} priceTableId
 */
export const getMonthlyPackagesByTable = async (priceTableId) => {
    const { data, error } = await supabase
        .from("package")
        .select(`
            package_id,
            price_table_id,
            vehicle_type_id,
            name,
            duration_month,
            price,
            status,
            vehicle_type:vehicle_type_id (
                vehicle_type_id,
                name
            )
        `)
        .eq("price_table_id", priceTableId);

    if (error) throw new Error("Lỗi lấy giá tháng: " + error.message);
    return data || [];
};

/**
 * Upsert các item giá lượt
 * @param {Array} items
 */
export const upsertPriceItems = async (items) => {
    if (!items || items.length === 0) return [];

    const { data, error } = await supabase
        .from("price_item")
        .upsert(items, { onConflict: "price_item_id" })
        .select();

    if (error) throw new Error("Lỗi lưu biểu giá lượt: " + error.message);
    return data;
};

/**
 * Xóa các item giá lượt theo price_table_id và vehicle_type_id
 */
export const deletePriceItemsByVehicleType = async (priceTableId, vehicleTypeId) => {
    const { error } = await supabase
        .from("price_item")
        .delete()
        .eq("price_table_id", priceTableId)
        .eq("vehicle_type_id", vehicleTypeId);

    if (error) throw new Error("Lỗi xóa biểu giá lượt cũ: " + error.message);
};

/**
 * Upsert các gói giá tháng
 * @param {Array} packages
 */
export const upsertMonthlyPackages = async (packages) => {
    if (!packages || packages.length === 0) return [];

    const { data, error } = await supabase
        .from("monthly_package")
        .upsert(packages, { onConflict: "price_table_id, vehicle_type_id, duration_month" })
        .select();

    if (error) throw new Error("Lỗi lưu biểu giá tháng: " + error.message);
    return data;
};
