import numpy as np
from easyocr import Reader

# =====================================================
# Load EasyOCR once when service starts
# =====================================================

easy_reader = Reader(['en'], gpu=True)


def read_plate(plate_image: np.ndarray) -> str:
    """Perform OCR on a cropped license‑plate image using EasyOCR.

    Args:
        plate_image: NumPy image array (BGR) of the plate region.

    Returns:
        Recognized text string (may contain spaces). Empty string on failure.
    """
    if plate_image is None:
        return ""

    # EasyOCR expects RGB images
    rgb_image = plate_image[..., ::-1]
    results = easy_reader.readtext(rgb_image, detail=0)
    # results is a list of strings
    if not results:
        return ""
    # Join with space to mimic previous behaviour
    return " ".join(results)
