import supabase from "../config/supabaseClient.js";
import * as parkingRepository from "../repositories/parkingRepository.js";

// ─── Bucket & folder constants ────────────────────────────────────────────────
const BUCKET = "parking-images";

/**
 * Upload một file buffer lên Supabase Storage và trả về public URL.
 *
 * @param {Buffer} buffer    - nội dung file (từ multer memoryStorage)
 * @param {string} folder    - thư mục trong bucket, ví dụ "entry/vehicle"
 * @param {string} filename  - tên file gốc
 * @returns {Promise<string>} public URL
 */
const uploadToStorage = async (buffer, folder, filename) => {
  const timestamp = Date.now();
  const safeName = filename.replace(/\s+/g, "_");
  const storagePath = `${folder}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      upsert: false,
      contentType: "image/*",
    });

  if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

  // Lấy public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};

// ─── Check-in service ─────────────────────────────────────────────────────────

/**
 * Xử lý check-in: validate → tìm vehicle → upload ảnh → tạo session.
 *
 * @param {string}  plateNumber       - biển số xe
 * @param {Express.Multer.File} vehicleImageFile - file ảnh xe (multer)
 * @param {Express.Multer.File} plateImageFile   - file ảnh biển số (multer)
 * @returns {Promise<{ success: boolean, message: string, session?: object }>}
 */
export const checkIn = async (plateNumber, vehicleImageFile, plateImageFile) => {
  // 1. Validate đầu vào
  if (!plateNumber || !plateNumber.trim()) {
    throw Object.assign(new Error("plate_number is required"), { statusCode: 400 });
  }
  if (!vehicleImageFile) {
    throw Object.assign(new Error("vehicleImage is required"), { statusCode: 400 });
  }
  if (!plateImageFile) {
    throw Object.assign(new Error("plateImage is required"), { statusCode: 400 });
  }

  // 2. Upload ảnh lên Supabase Storage
  const [entryVehicleUrl, entryPlateUrl] = await Promise.all([
    uploadToStorage(vehicleImageFile.buffer, "entry/vehicle", vehicleImageFile.originalname),
    uploadToStorage(plateImageFile.buffer, "entry/plate", plateImageFile.originalname),
  ]);

  // 3. Tạo parking session
  const session = await parkingRepository.createParkingSession({
    vehicle_id: null,
    plate_number: plateNumber.trim().toUpperCase(),
    entry_vehicle_image: entryVehicleUrl,
    entry_plate_image: entryPlateUrl,
  });

  return { success: true, message: "Check in successfully", session };
};

/**
 * Xử lý check-out: validate → tìm active session → upload ảnh OUT → tính tiền → cập nhật session.
 *
 * @param {string}  plateNumber       - biển số xe
 * @param {Express.Multer.File} vehicleImageFile - file ảnh xe ra (multer)
 * @param {Express.Multer.File} plateImageFile   - file ảnh biển số ra (multer)
 * @returns {Promise<{ success: boolean, message: string, session?: object, fee: number }>}
 */
export const checkOut = async (plateNumber, vehicleImageFile, plateImageFile) => {
  // 1. Validate đầu vào
  if (!plateNumber || !plateNumber.trim()) {
    throw Object.assign(new Error("plate_number is required"), { statusCode: 400 });
  }
  if (!vehicleImageFile) {
    throw Object.assign(new Error("vehicleImage is required"), { statusCode: 400 });
  }
  if (!plateImageFile) {
    throw Object.assign(new Error("plateImage is required"), { statusCode: 400 });
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // 2. Tìm active session của biển số này
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (!activeSession) {
    throw Object.assign(new Error("No active parking session found for this vehicle"), { statusCode: 404 });
  }

  // 3. Upload ảnh ra lên Supabase Storage
  const [exitVehicleUrl, exitPlateUrl] = await Promise.all([
    uploadToStorage(vehicleImageFile.buffer, "exit/vehicle", vehicleImageFile.originalname),
    uploadToStorage(plateImageFile.buffer, "exit/plate", plateImageFile.originalname),
  ]);

  // 4. Tính tiền gửi xe
  let entryTimeStr = activeSession.entry_time;
  if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
    entryTimeStr += "Z";
  }
  const entryTime = new Date(entryTimeStr);
  const exitTime = new Date();
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const billableHours = Math.max(1, Math.ceil(totalHours)); // ít nhất 1 giờ

  let fee = billableHours * 10000; // Giá mặc định 10k/giờ

  // Thử tra cứu bảng giá từ Database nếu xe có liên kết vehicle_id
  if (activeSession.vehicle_id) {
    try {
      // Tìm thông tin xe để lấy vehicle_type_id
      const { data: vehicle } = await supabase
        .from("vehicle")
        .select("vehicle_type_id")
        .eq("vehicle_id", activeSession.vehicle_id)
        .maybeSingle();

      if (vehicle?.vehicle_type_id) {
        // Tìm price_item khớp với loại xe và số giờ
        const { data: priceItems } = await supabase
          .from("price_item")
          .select("price, min_hour, max_hour")
          .eq("vehicle_type_id", vehicle.vehicle_type_id);

        if (priceItems && priceItems.length > 0) {
          // Tìm khoảng giờ phù hợp
          const matchingItem = priceItems.find(item => {
            const min = item.min_hour || 0;
            const max = item.max_hour;
            if (max === null || max === undefined) {
              return billableHours >= min;
            }
            return billableHours >= min && billableHours <= max;
          });

          if (matchingItem) {
            fee = Number(matchingItem.price);
          }
        }
      }
    } catch (dbErr) {
      console.error("Error fetching database pricing, falling back to default:", dbErr);
    }
  }

  // 5. Cập nhật phiên gửi xe thành COMPLETED
  const updatedSession = await parkingRepository.updateParkingSession(activeSession.session_id, {
    exit_time: exitTime.toISOString(),
    exit_vehicle_image: exitVehicleUrl,
    exit_plate_image: exitPlateUrl,
    status: "COMPLETED",
  });

  return { 
    success: true, 
    message: "Check out successfully", 
    session: updatedSession, 
    fee 
  };
};
