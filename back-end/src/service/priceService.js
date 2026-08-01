import * as priceRepository from "../repositories/priceRepository.js";
import { config } from "../config/config.js";

const getVehicleIcon = (name) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("ô tô") || lower.includes("car") || lower.includes("oto")) return "directions_car";
    if (lower.includes("xe máy") || lower.includes("motor") || lower.includes("bike")) return "two_wheeler";
    return "directions_car";
};

const getVehicleColor = (name) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("ô tô") || lower.includes("car") || lower.includes("oto")) return "#8B5CF6";
    if (lower.includes("xe máy") || lower.includes("motor") || lower.includes("bike")) return "#3B82F6";
    return "#10B981";
};

/**
 * Lấy toàn bộ biểu giá (lượt & tháng) theo tòa nhà của Manager
 * @param {string} userId
 */
export const getPricesForManager = async (userId) => {
    // 1. Lấy thông tin profile tòa nhà
    const profile = await priceRepository.getManagerBuildingProfile(userId);
    if (!profile || !profile.building_id) {
        const err = new Error("Tài khoản chưa được gán tòa nhà quản lý. Vui lòng liên hệ Admin.");
        err.statusCode = 400;
        throw err;
    }

    const buildingId = profile.building_id;
    const buildingName = profile.building?.name || "Tòa nhà";

    // 2. Lấy bãi xe thuộc tòa nhà
    const parking = await priceRepository.getParkingByBuildingId(buildingId);
    if (!parking) {
        const err = new Error(`Tòa nhà "${buildingName}" chưa được cấu hình bãi đỗ xe.`);
        err.statusCode = 404;
        throw err;
    }

    // 3. Lấy hoặc tạo bảng giá active
    const priceTable = await priceRepository.getOrCreateActivePriceTable(parking.parking_id, buildingName);
    const priceTableId = priceTable.price_table_id;

    // 4. Lấy tất cả loại xe
    const vehicleTypes = await priceRepository.getVehicleTypes();

    // 5. Lấy price_items (giá lượt) và monthly_packages (giá tháng)
    const rawPriceItems = await priceRepository.getPriceItemsByTable(priceTableId);
    const rawMonthlyPackages = await priceRepository.getMonthlyPackagesByTable(priceTableId);

    // 6. Format dữ liệu giá lượt (sessionPrices)
    const sessionPrices = vehicleTypes.map((vt) => {
        const itemsForVt = rawPriceItems.filter((item) => item.vehicle_type_id === vt.vehicle_type_id);

        const itemFirst = itemsForVt.find((i) => Number(i.min_hour) === 0);
        const itemExtra = itemsForVt.find((i) => Number(i.min_hour) > 0 && i.max_hour !== null);
        const itemMax = itemsForVt.find((i) => i.max_hour === null || Number(i.min_hour) >= 8);

        const firstHour = itemFirst ? Number(itemFirst.price) : 0;
        const extraHour = itemExtra ? Number(itemExtra.price) : 0;
        const dayMax = itemMax ? Number(itemMax.price) : 0;

        const formattedTimeSlots = itemsForVt.length > 0
            ? itemsForVt
                .map((i) => ({
                    min: Number(i.min_hour),
                    max: i.max_hour !== null && i.max_hour !== undefined ? Number(i.max_hour) : 24,
                    price: Number(i.price),
                }))
                .sort((a, b) => a.min - b.min)
            : [];

        return {
            id: vt.vehicle_type_id,
            vehicleTypeId: vt.vehicle_type_id,
            vehicleType: vt.name,
            icon: getVehicleIcon(vt.name),
            color: getVehicleColor(vt.name),
            firstHour,
            extraHour,
            dayMax,
            timeSlots: formattedTimeSlots,
        };
    });

    // 7. Format dữ liệu giá tháng (monthlyPrices)
    const monthlyPrices = vehicleTypes.map((vt) => {
        const pkgsForVt = rawMonthlyPackages.filter((pkg) => pkg.vehicle_type_id === vt.vehicle_type_id);

        const pkg1 = pkgsForVt.find((p) => Number(p.duration_month) === 1);
        const pkg3 = pkgsForVt.find((p) => Number(p.duration_month) === 3);
        const pkg6 = pkgsForVt.find((p) => Number(p.duration_month) === 6);
        const pkg12 = pkgsForVt.find((p) => Number(p.duration_month) === 12);

        const price1Month = pkg1 ? Number(pkg1.price) : 0;
        const price3Month = pkg3 ? Number(pkg3.price) : 0;
        const price6Month = pkg6 ? Number(pkg6.price) : 0;
        const price12Month = pkg12 ? Number(pkg12.price) : 0;

        return {
            id: vt.vehicle_type_id,
            vehicleTypeId: vt.vehicle_type_id,
            vehicleType: vt.name,
            icon: getVehicleIcon(vt.name),
            color: getVehicleColor(vt.name),
            price1Month,
            price3Month,
            price6Month,
            price12Month,
        };
    });

    return {
        buildingId,
        buildingName,
        priceTableId,
        cardReissueFee: priceTable?.card_reissue_fee != null ? Number(priceTable.card_reissue_fee) : config.defaultCardReissueFee,
        sessionPrices,
        monthlyPrices,
    };
};

/**
 * Cập nhật giá lượt cho 1 loại xe thuộc tòa nhà của Manager
 * @param {string} userId
 * @param {object} payload - { vehicleTypeId, firstHour, extraHour, dayMax }
 */
export const updateSessionPrices = async (userId, payload) => {
    const { vehicleTypeId, timeSlots, firstHour, extraHour, dayMax } = payload;
    if (!vehicleTypeId) {
        const err = new Error("Thiếu thông tin loại xe (vehicleTypeId).");
        err.statusCode = 400;
        throw err;
    }

    const { priceTableId } = await getPricesForManager(userId);

    // 1. Xóa các item cũ của vehicleTypeId này trong priceTableId để ghi đè sạch đẹp
    await priceRepository.deletePriceItemsByVehicleType(priceTableId, vehicleTypeId);

    // 2. Tạo các dòng price_item mới:
    let newItems = [];
    if (timeSlots && Array.isArray(timeSlots) && timeSlots.length > 0) {
        newItems = timeSlots.map((slot, index) => {
            const isLast = index === timeSlots.length - 1;
            const maxVal = (slot.max === null || slot.max === undefined || slot.max === '' || (Number(slot.max) >= 24 && isLast)) ? null : Number(slot.max);
            return {
                price_table_id: priceTableId,
                vehicle_type_id: vehicleTypeId,
                min_hour: Number(slot.min),
                max_hour: maxVal,
                price: Number(slot.price),
            };
        });
    } else {
        newItems = [
            {
                price_table_id: priceTableId,
                vehicle_type_id: vehicleTypeId,
                min_hour: 0,
                max_hour: 1,
                price: firstHour,
            },
            {
                price_table_id: priceTableId,
                vehicle_type_id: vehicleTypeId,
                min_hour: 1,
                max_hour: 8,
                price: extraHour,
            },
            {
                price_table_id: priceTableId,
                vehicle_type_id: vehicleTypeId,
                min_hour: 8,
                max_hour: null,
                price: dayMax,
            },
        ];
    }

    await priceRepository.upsertPriceItems(newItems);
    return getPricesForManager(userId);
};


/**
 * Cập nhật giá tháng cho 1 loại xe thuộc tòa nhà của Manager
 * @param {string} userId
 * @param {object} payload - { vehicleTypeId, vehicleType, price1Month, price3Month, price6Month, price12Month }
 */
export const updateMonthlyPrices = async (userId, payload) => {
    const { vehicleTypeId, vehicleType, price1Month, price3Month, price6Month, price12Month } = payload;
    if (!vehicleTypeId) {
        const err = new Error("Thiếu thông tin loại xe (vehicleTypeId).");
        err.statusCode = 400;
        throw err;
    }

    const { priceTableId } = await getPricesForManager(userId);
    const vtName = vehicleType || "xe";

    const packages = [
        {
            price_table_id: priceTableId,
            vehicle_type_id: vehicleTypeId,
            name: `Gói ${vtName} 1 tháng`,
            duration_month: 1,
            price: price1Month,
            status: "Hoạt động",
        },
        {
            price_table_id: priceTableId,
            vehicle_type_id: vehicleTypeId,
            name: `Gói ${vtName} 3 tháng`,
            duration_month: 3,
            price: price3Month,
            status: "Hoạt động",
        },
        {
            price_table_id: priceTableId,
            vehicle_type_id: vehicleTypeId,
            name: `Gói ${vtName} 6 tháng`,
            duration_month: 6,
            price: price6Month,
            status: "Hoạt động",
        },
        {
            price_table_id: priceTableId,
            vehicle_type_id: vehicleTypeId,
            name: `Gói ${vtName} 12 tháng`,
            duration_month: 12,
            price: price12Month,
            status: "Hoạt động",
        },
    ];

    await priceRepository.upsertMonthlyPackages(packages);
    return getPricesForManager(userId);
};

/**
 * Cập nhật phí cấp lại thẻ
 * @param {string} userId
 * @param {object} payload - { cardReissueFee }
 */
export const updateCardReissueFee = async (userId, payload) => {
    const { cardReissueFee } = payload;
    if (cardReissueFee === undefined || cardReissueFee === null) {
        const err = new Error("Thiếu thông tin phí cấp lại thẻ (cardReissueFee).");
        err.statusCode = 400;
        throw err;
    }

    const { priceTableId } = await getPricesForManager(userId);
    await priceRepository.updateCardReissueFee(priceTableId, cardReissueFee);
    return getPricesForManager(userId);
};
