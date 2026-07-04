import io
import re
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR

app = FastAPI(title="PaddleOCR License Plate Recognition Service")

# Khởi tạo mô hình PaddleOCR một lần duy nhất khi khởi động server
ocr = PaddleOCR(use_angle_cls=True, lang="en")

def smart_correct_vietnamese_plate(plate: str) -> str:
    """
    Hàm chuẩn hóa thông minh biển số xe Việt Nam.
    Tự động sửa các lỗi OCR phổ biến (S->5, B->8,...) dựa theo vị trí và định dạng biển số.
    """
    # Chỉ giữ lại ký tự chữ cái và chữ số, viết hoa
    plate = re.sub(r'[^A-Z0-9]', '', plate.upper())
    
    char_to_num = {
        'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'T': '7'
    }
    num_to_char = {
        '0': 'D', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'
    }
    
    def to_num(c):
        return char_to_num.get(c, c)
        
    def to_char(c):
        return num_to_char.get(c, c)
        
    n = len(plate)
    if n < 7:
        return plate
        
    chars = list(plate)
    
    # 1. Hai ký tự đầu tiên bắt buộc phải là số (Mã vùng/Tỉnh thành)
    chars[0] = to_num(chars[0])
    chars[1] = to_num(chars[1])
    
    # 2. Ký tự thứ 3 bắt buộc phải là chữ (Sê-ri biển số)
    chars[2] = to_char(chars[2])
    
    # 3. Xử lý các ký tự phía sau theo chiều dài chuỗi biển số
    if len(chars) == 9:
        # Định dạng xe máy đời mới (ví dụ: 59S1-234.56 -> 9 ký tự: 59S123456)
        # Ký tự thứ 4 bắt buộc là số sê-ri phụ
        chars[3] = to_num(chars[3])
        # Các ký tự từ thứ 5 đến thứ 9 bắt buộc là số thứ tự
        for i in range(4, 9):
            chars[i] = to_num(chars[i])
            
    elif len(chars) == 8:
        # Có 2 trường hợp chính:
        # - Ô tô: 30A-123.45 -> 8 ký tự: 30A12345 (2 số + 1 chữ + 5 số)
        # - Xe máy sê-ri đôi (ví dụ xe điện): 29AA-123.4 -> 8 ký tự: 29AA1234 (2 số + 2 chữ + 4 số)
        
        # Kiểm tra xem ký tự thứ 4 có phải là chữ cái không
        # Nếu nguyên bản là chữ cái không dễ nhầm hoặc có ký tự chữ cái trong phần này
        is_double_letter = chars[3] in ('A', 'C', 'E', 'F', 'H', 'K', 'M', 'N', 'P', 'Q', 'R', 'U', 'V', 'W', 'X', 'Y')
        if is_double_letter:
            # Trường hợp 29AA1234
            chars[3] = to_char(chars[3])
            for i in range(4, 8):
                chars[i] = to_num(chars[i])
        else:
            # Trường hợp 30A12345
            for i in range(3, 8):
                chars[i] = to_num(chars[i])
                
    elif len(chars) == 7:
        # Định dạng cũ: 29A-1234 -> 7 ký tự: 29A1234 (2 số + 1 chữ + 4 số)
        for i in range(3, 7):
            chars[i] = to_num(chars[i])
            
    return "".join(chars)

@app.get("/")
def home():
    return {"status": "ok", "message": "PaddleOCR License Plate Recognition Service is running"}

@app.post("/ocr")
async def ocr_read(file: UploadFile = File(...)):
    import os
    try:
        contents = await file.read()
        
        # Tạo thư mục temp nếu chưa có
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Tạo tên file tạm thời duy nhất
        temp_file_path = os.path.join(temp_dir, f"ocr_temp_{os.getpid()}.jpg")
        
        # Ghi nội dung file ảnh xuống đĩa
        with open(temp_file_path, "wb") as f:
            f.write(contents)
            
        try:
            # Chạy nhận diện bằng đường dẫn file (khớp với test.py hoạt động ổn định)
            result = ocr.ocr(temp_file_path)
        finally:
            # Luôn dọn dẹp file tạm sau khi chạy xong
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        
        if not result or not result[0]:
            return {"success": False, "message": "Không tìm thấy biển số hoặc không nhận diện được chữ."}
            
        # Ghép các khối chữ nhận diện được thành chuỗi duy nhất
        raw_plate = "".join([line[1][0] for line in result[0]])
        
        # Áp dụng chuẩn hóa thông minh
        corrected_plate = smart_correct_vietnamese_plate(raw_plate)
        
        return {
            "success": True,
            "raw_plate": raw_plate,
            "plate": corrected_plate
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )