/**
 * Utility chuẩn hóa và kiểm tra tính hợp lệ của biển số xe Việt Nam.
 */

/**
 * Chuẩn hóa chuỗi biển số xe:
 * - Chuyển sang chữ hoa
 * - Loại bỏ tất cả các ký tự không phải chữ cái A-Z và chữ số 0-9 (dấu chấm, gạch ngang, khoảng trắng,...)
 */
export const normalizePlate = (plate) => {
    if (!plate || typeof plate !== 'string') return '';
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

/**
 * Kiểm tra biển số xe Việt Nam có đúng các định dạng hợp lệ:
 * 1. Xe máy 5 số: 2 số tỉnh + 2-3 seri (chữ+số hoặc 2 chữ hoặc chữ+chữ+số như H1, SA, MD1) + 5 số (VD: 29H112345, 59SA67890, 29MD112345) -> 9-10 ký tự
 * 2. Xe máy 4 số (cũ): 2 số tỉnh + 2 seri (chữ+số hoặc 2 chữ, VD: F1) + 4 số (VD: 29F11234) -> 8 ký tự
 * 3. Ô tô 5 số: 2 số tỉnh + 1-2 chữ cái seri (VD: A, K, LD) + 5 số (VD: 30A12345, 51K67890, 51LD12345) -> 8-9 ký tự
 * 4. Ô tô 4 số (cũ): 2 số tỉnh + 1 chữ cái seri (VD: T) + 4 số (VD: 29T1234) -> 7 ký tự
 * 5. Biển ngoại giao / nước ngoài (VD: 80NG01101, 29NN12345)
 * 6. Biển quân đội (VD: TM1234, TH5678)
 */
export const validatePlateNumber = (rawPlate) => {
    const clean = normalizePlate(rawPlate);

    if (!clean) {
        return {
            isValid: false,
            message: 'Vui lòng nhập biển số xe.'
        };
    }

    // Các Pattern định dạng biển số Việt Nam
    const regexXeMay5So = /^[0-9]{2}[A-Z][A-Z0-9]{1,2}[0-9]{5}$/;
    const regexXeMay4So = /^[0-9]{2}[A-Z][A-Z0-9][0-9]{4}$/;
    const regexOTo5So = /^[0-9]{2}[A-Z]{1,2}[0-9]{5}$/;
    const regexOTo4So = /^[0-9]{2}[A-Z]{1}[0-9]{4}$/;
    const regexNgoaiGiao = /^[0-9]{2}(NG|NN|QT|CV)[0-9]{5}$/;
    const regexQuanDoi = /^[A-Z]{2}[0-9]{4,5}$/;

    const isValid =
        regexXeMay5So.test(clean) ||
        regexXeMay4So.test(clean) ||
        regexOTo5So.test(clean) ||
        regexOTo4So.test(clean) ||
        regexNgoaiGiao.test(clean) ||
        regexQuanDoi.test(clean);

    if (!isValid) {
        return {
            isValid: false,
            message: 'Biển số xe không đúng định dạng Việt Nam (VD: 29H112345, 59SA67890, 29F11234, 30A12345, 51K67890, 51LD12345, 29T1234).'
        };
    }

    return {
        isValid: true,
        cleanPlate: clean
    };
};
