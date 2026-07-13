import re

# ==========================================
# Mapping sửa lỗi OCR
# ==========================================

CHAR_TO_NUM = {
    "O": "0",
    "Q": "0",
    "D": "0",
    "I": "1",
    "L": "1",
    "J": "1",
    "Z": "2",
    "E": "3",
    "A": "4",
    "S": "5",
    "G": "6",
    "T": "7",
    "B": "8",
}

NUM_TO_CHAR = {
    "0": "D",
    "1": "I",
    "2": "Z",
    "3": "A",  # 'A' is often misread as '3' in square fonts
    "4": "A",  # 'A' is often misread as '4'
    "5": "S",
    "6": "G",
    "7": "T",
    "8": "B",
    "9": "P",
}


def clean_text(text: str) -> str:
    """
    Xóa khoảng trắng, ký tự đặc biệt và các từ khóa thương hiệu xe phổ biến.
    """

    if text is None:
        return ""

    text = text.upper()

    # Tiền xử lý ký tự: thay thế các dấu gạch thẳng, xéo có thể bị nhận diện nhầm từ số 1 hoặc dấu gạch ngang
    text = text.replace("|", "1")
    text = text.replace("/", "1")
    text = text.replace("\\", "1")

    # Loại bỏ tên thương hiệu và từ khóa rác xuất hiện gần biển số
    brands = [
        "HONDA", "H0NDA", "YAMAHA", "SUZUKI", "SYM", "VESPA", "PIAGGIO",
        "VIETNAM", "VIET NAM", "VN", "BIENSO", "BIEN SO"
    ]
    for brand in brands:
        text = text.replace(brand, "")

    text = re.sub(r"[^A-Z0-9]", "", text)

    return text


def to_number(char: str) -> str:
    return CHAR_TO_NUM.get(char, char)


def to_character(char: str) -> str:
    return NUM_TO_CHAR.get(char, char)


def smart_correct(plate: str) -> str:
    """
    Chuẩn hóa biển số Việt Nam.
    """

    plate = clean_text(plate)

    if len(plate) < 7:
        return plate

    chars = list(plate)

    # 2 số đầu bắt buộc là số (mã tỉnh)
    chars[0] = to_number(chars[0])
    chars[1] = to_number(chars[1])

    # Ký tự thứ 3 bắt buộc phải là chữ
    chars[2] = to_character(chars[2])

    # Xe máy / Ô tô mới (9 ký tự)
    # Ví dụ: 29M156789, 29AA56789, 30LD56789
    if len(chars) == 9:
        # Nếu ký tự thứ 4 thực sự là chữ cái (e.g. 29AA..., 30LD...)
        # Ta check xem nó có phải chữ cái hợp lệ sau khi map không và loại trừ các chữ cái cấm
        if chars[3].isalpha() and chars[3] not in ["I", "J", "O", "Q", "W"]:
            chars[3] = to_character(chars[3])
            for i in range(4, 9):
                chars[i] = to_number(chars[i])
        else:
            # Nếu không phải chữ cái hợp lệ, hoặc là số -> ép về số (e.g., 29M1...)
            chars[3] = to_number(chars[3])
            for i in range(4, 9):
                chars[i] = to_number(chars[i])

    # Ô tô hoặc xe máy (8 ký tự)
    # Ví dụ: 30A12345 (Ô tô), 29M11234 (Xe máy cũ), 29AA1234 (Xe máy dưới 50cc cũ)
    elif len(chars) == 8:
        if chars[3].isalpha() and chars[3] not in ["I", "J", "O", "Q", "W"]:
            chars[3] = to_character(chars[3])
            for i in range(4, 8):
                chars[i] = to_number(chars[i])
        else:
            chars[3] = to_number(chars[3])
            for i in range(4, 8):
                chars[i] = to_number(chars[i])

    # Biển cũ (7 ký tự)
    elif len(chars) == 7:
        for i in range(3, 7):
            chars[i] = to_number(chars[i])

    return "".join(chars)


def format_plate(raw_text: str) -> str:
    """
    Hàm chính dùng cho app.py
    """

    raw_text = clean_text(raw_text)

    raw_text = smart_correct(raw_text)

    return raw_text
