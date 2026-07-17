import multer from "multer";

/**
 * Multer middleware – lưu file vào bộ nhớ (buffer).
 * Buffer sẽ được upload thẳng lên Supabase Storage từ Service layer.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận ảnh (image/*)
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // tối đa 10 MB mỗi file
    },
});

export default upload;