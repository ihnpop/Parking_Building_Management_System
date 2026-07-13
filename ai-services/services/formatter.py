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
    "Z": "2",
    "S": "5",
    "B": "8",
    "G": "6",
    "T": "7",
}

NUM_TO_CHAR = {
    "0": "D",
    "1": "I",
    "2": "Z",
    "3": "E",
    "5": "S",
    "6": "G",
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

    # Loại bỏ tên thương hiệu xe thường xuất hiện gần biển số
    brands = ["HONDA", "H0NDA", "YAMAHA", "SUZUKI", "SYM", "VESPA", "PIAGGIO"]
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

    # 2 số đầu
    chars[0] = to_number(chars[0])
    chars[1] = to_number(chars[1])

    # ký tự thứ 3 phải là chữ
    chars[2] = to_character(chars[2])

    # xe máy mới
    if len(chars) == 9:

        chars[3] = to_number(chars[3])

        for i in range(4, 9):
            chars[i] = to_number(chars[i])

    # ô tô hoặc xe điện
    elif len(chars) == 8:

        double_letter = chars[3].isalpha()

        if double_letter:

            chars[3] = to_character(chars[3])

            for i in range(4, 8):
                chars[i] = to_number(chars[i])

        else:

            for i in range(3, 8):
                chars[i] = to_number(chars[i])

    # biển cũ
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
