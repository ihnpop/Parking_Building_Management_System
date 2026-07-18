import supabase from "../config/supabaseClient.js";

// ─── Bucket constant ──────────────────────────────────────────────────────────
const BUCKET = "parking-images";

/**
 * Upload một file buffer lên Supabase Storage và trả về public URL.
 *
 * @param {Buffer} buffer    - nội dung file (từ multer memoryStorage)
 * @param {string} folder    - thư mục trong bucket, ví dụ "entry/vehicle"
 * @param {string} filename  - tên file gốc
 * @returns {Promise<string>} public URL
 */
export const uploadToStorage = async (buffer, folder, filename) => {
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

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};
