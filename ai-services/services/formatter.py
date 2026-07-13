import re

# ==========================================
# Mapping sua loi OCR
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
    "3": "A",
    "4": "A",
    "5": "S",
    "6": "G",
    "7": "T",
    "8": "B",
    "9": "P",
}

# Cac ky tu ma EasyOCR THUONG XUYEN nham giua chu va so
# Key = chu cai OCR doc ra, Value = so ma no rat co the dang la
# Dung khi ky tu xuat hien o vi tri BAT BUOC la so (vi tri 4+ cua bien so)
OCR_LETTER_TO_DIGIT = {
    "Z": "2",  # Z <-> 2 (rat pho bien)
    "T": "1",  # T <-> 1 (net doc mong, EasyOCR hay nham)
    "I": "1",  # I <-> 1
    "L": "1",  # L <-> 1
    "O": "0",  # O <-> 0
    "D": "0",  # D <-> 0
    "Q": "0",  # Q <-> 0
    "B": "8",  # B <-> 8
    "S": "5",  # S <-> 5
    "G": "6",  # G <-> 6
    "E": "3",  # E <-> 3
    "A": "4",  # A <-> 4
    "J": "1",  # J <-> 1
}

# Cac chu cai o vi tri thu 4 ma GAN NHU CHAC CHAN la so bi doc nham
# Chi Z va T: 2 ky tu gay loi nhieu nhat trong thuc te
# - Z bi nham voi 2 (hinh dang rat giong)
# - T bi nham voi 1 (net doc mong)
# Cac chu khac (A, B, D, L...) tuy co the nham nhung cung la chu se-ri hop le pho bien
HIGH_CONFUSION_AT_POS4 = {"Z", "T"}

# Danh sach se-ri 1 chu hop le trong bien so Viet Nam
VALID_SERIES = set("ABCDEFGHKLMNPSTUVXYZ")

# Danh sach se-ri 2 chu hop le tren bien xe may / o to moi
# Day du theo Thong tu 79/2024/TT-BCA
VALID_DOUBLE_SERIES = {
    "AA", "AB", "AC", "AD", "AE", "AF",
    "BA", "BB", "BC", "BD", "BE", "BF",
    "CA", "CB", "CC", "CD", "CE", "CF",
    "DA", "DB", "DC", "DD", "DE", "DF",
    "EA", "EB", "EC", "ED",
    "FA", "FB", "FC", "FD",
    "GA", "GB", "GC", "GD",
    "HA", "HB", "HC", "HD",
    "KA", "KB", "KC", "KD",
    "LA", "LB", "LC", "LD",
    "MA", "MB", "MC", "MD",
    "NA", "NB", "NC", "ND",
    "PA", "PB", "PC", "PD",
    "SA", "SB", "SC", "SD",
    "TA", "TB", "TC", "TD",
    "UA", "UB", "UC", "UD",
    "VA", "VB", "VC", "VD",
    "XA", "XB", "XC", "XD",
    "YA", "YB", "YC", "YD",
    "ZA", "ZB", "ZC", "ZD",
}

# Regex: bien so Viet Nam hop le
PLATE_PATTERN = re.compile(
    r"^\d{2}[A-Z]{1,2}\d{4,6}$"
)


def clean_text(text: str) -> str:
    """
    Xoa khoang trang, ky tu dac biet va cac tu khoa thuong hieu xe pho bien.
    """

    if text is None:
        return ""

    text = text.upper()

    # Tien xu ly ky tu: thay the cac dau gach thang, xeo co the bi nhan dien nham tu so 1
    text = text.replace("|", "1")
    text = text.replace("/", "1")
    text = text.replace("\\", "1")

    # Loai bo ten thuong hieu va tu khoa rac xuat hien gan bien so
    brands = [
        "HONDA", "H0NDA", "YAMAHA", "SUZUKI", "SYM", "VESPA", "PIAGGIO",
        "VIETNAM", "VIET NAM", "VN", "BIENSO", "BIEN SO"
    ]
    for brand in brands:
        text = text.replace(brand, "")

    text = re.sub(r"[^A-Z0-9]", "", text)

    return text


def to_number(char: str) -> str:
    """Map chu cai -> so (dung cho vi tri bat buoc la so nhu ma tinh)."""
    return CHAR_TO_NUM.get(char, char)


def to_digit_at_pos4(char: str) -> str:
    """Map chu cai -> so, su dung bang OCR_LETTER_TO_DIGIT
    (co them T->1 thay vi T->7 nhu CHAR_TO_NUM).
    Dung cho vi tri thu 4+ cua bien so (phan so).
    """
    return OCR_LETTER_TO_DIGIT.get(char, char)


def to_character(char: str) -> str:
    return NUM_TO_CHAR.get(char, char)


def _is_valid_double_series(c1: str, c2: str) -> bool:
    """Kiem tra xem 2 ky tu co tao thanh se-ri 2 chu hop le khong."""
    return (c1 + c2) in VALID_DOUBLE_SERIES


def _normalize_to_target_length(plate: str) -> str:
    """
    Neu bien so sau khi clean co nhieu hon 9 ky tu (do EasyOCR doc thua),
    co gang cat ve 7-9 ky tu hop le.
    """

    if 7 <= len(plate) <= 9:
        return plate

    if len(plate) > 9:
        # Tim vi tri bat dau: 2 so + 1 chu
        plate_start = -1
        for i in range(len(plate) - 6):
            if plate[i].isdigit() and plate[i+1].isdigit() and plate[i+2].isalpha():
                plate_start = i
                break

        if plate_start >= 0:
            header = plate[plate_start:plate_start + 2]  # 2 so ma tinh
            rest = plate[plate_start + 2:]

            # Tach chu se-ri ra khoi phan so
            letter_count = 0
            for ch in rest:
                if ch.isalpha():
                    letter_count += 1
                else:
                    break
            # Gioi han toi da 2 chu se-ri
            letter_count = min(letter_count, 2)

            series = rest[:letter_count]
            digits = rest[letter_count:]

            # Loai bo cac ky tu chu con sot lai trong phan so
            digits = re.sub(r"[^0-9]", "", digits)

            # Xac dinh target so luong digit
            if letter_count == 2:
                target_digits = 5  # 2 so + 2 chu + 5 so = 9
            else:
                # Uu tien 5 so (bien 8 ky tu - o to) hoac 6 so (bien 9 ky tu - xe may)
                if len(digits) >= 6:
                    target_digits = 6
                else:
                    target_digits = 5

            # Cat phan so ve target
            if len(digits) > target_digits:
                digits = digits[:target_digits]

            return header + series + digits

        # Fallback: lay 9 ky tu dau
        return plate[:9]

    # Qua ngan — tra ve nguyen
    return plate


def smart_correct(plate: str) -> str:
    """
    Chuan hoa bien so Viet Nam.
    Xu ly cac loi pho bien tu EasyOCR:
    - Z <-> 2 nham lan o vi tri so
    - T <-> 1 nham lan o vi tri so
    - B <-> 8 nham lan o vi tri ma tinh
    - Thua/thieu ky tu
    """

    plate = clean_text(plate)
    plate = _normalize_to_target_length(plate)

    if len(plate) < 7:
        return plate

    chars = list(plate)

    # --- Buoc 1: Ma tinh (2 so dau) ---
    chars[0] = to_number(chars[0])
    chars[1] = to_number(chars[1])

    # --- Buoc 2: Se-ri (ky tu thu 3 bat buoc la chu) ---
    chars[2] = to_character(chars[2])

    # --- Buoc 3: Phan loai va sua phan con lai ---

    if len(chars) == 9:
        candidate_4th = chars[3]

        # Kiem tra double-series: chi khi ky tu thu 4 la chu cai
        # VA cap (chars[2], chars[3]) nam trong VALID_DOUBLE_SERIES
        # VA ky tu thu 4 KHONG phai la chu de bi nham voi so
        is_double = False
        if candidate_4th.isalpha():
            pair = chars[2] + candidate_4th
            if pair in VALID_DOUBLE_SERIES:
                # Kiem tra them: neu chu thu 4 nam trong OCR_LETTER_TO_DIGIT
                # (de bi nham voi so), thi uu tien coi la so
                # TRU KHI chu thu 4 KHONG co trong OCR_LETTER_TO_DIGIT
                if candidate_4th not in HIGH_CONFUSION_AT_POS4:
                    is_double = True
                # Else: chu thu 4 bi nham voi so -> coi la so

        if is_double:
            for i in range(4, 9):
                chars[i] = to_digit_at_pos4(chars[i])
        else:
            # Ky tu thu 4 phai la so -> ep ve so (dung bang T->1, Z->2)
            chars[3] = to_digit_at_pos4(chars[3])
            for i in range(4, 9):
                chars[i] = to_digit_at_pos4(chars[i])

    elif len(chars) == 8:
        candidate_4th = chars[3]

        is_double = False
        if candidate_4th.isalpha():
            pair = chars[2] + candidate_4th
            if pair in VALID_DOUBLE_SERIES:
                if candidate_4th not in HIGH_CONFUSION_AT_POS4:
                    is_double = True

        if is_double:
            for i in range(4, 8):
                chars[i] = to_digit_at_pos4(chars[i])
        else:
            chars[3] = to_digit_at_pos4(chars[3])
            for i in range(4, 8):
                chars[i] = to_digit_at_pos4(chars[i])

    elif len(chars) == 7:
        for i in range(3, 7):
            chars[i] = to_digit_at_pos4(chars[i])

    return "".join(chars)


def format_plate(raw_text: str) -> str:
    """
    Ham chinh dung cho app.py.
    Pipeline: clean -> normalize length -> smart correct.
    """

    raw_text = clean_text(raw_text)
    raw_text = smart_correct(raw_text)

    return raw_text
