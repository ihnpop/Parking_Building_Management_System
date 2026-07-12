import cv2
import numpy as np


def preprocess_plate(plate):
    """
    Tiền xử lý ảnh biển số trước khi OCR
    """

    # =====================================================
    # Resize
    # =====================================================

    target_width = 320

    h, w = plate.shape[:2]

    ratio = target_width / w

    target_height = int(h * ratio)

    plate = cv2.resize(
        plate, (target_width, target_height), interpolation=cv2.INTER_CUBIC
    )

    # =====================================================
    # Gray
    # =====================================================

    gray = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY)

    # =====================================================
    # Denoise
    # =====================================================

    gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

    # =====================================================
    # Histogram Equalization
    # =====================================================

    gray = cv2.equalizeHist(gray)

    # =====================================================
    # Sharpen
    # =====================================================

    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])

    sharp = cv2.filter2D(gray, -1, kernel)

    return sharp
