from paddleocr import PaddleOCR
import numpy as np

# =====================================================
# Load PaddleOCR duy nhất khi service khởi động
# =====================================================

ocr = PaddleOCR(
    use_angle_cls=False,
    lang="en",
    enable_mkldnn=True,
    cpu_threads=2,
    ocr_version="PP-OCRv4",
    det_limit_side_len=480,
    show_log=False,
)


def read_plate(plate_image: np.ndarray):
    """
    OCR biển số.

    Parameters
    ----------
    plate_image : numpy.ndarray

    Returns
    -------
    str
    """

    if plate_image is None:
        return ""

    result = ocr.ocr(plate_image, cls=False)

    if not result:
        return ""

    if len(result) == 0:
        return ""

    lines = result[0]

    if not lines:
        return ""

    texts = []

    # PaddleOCR 3.x
    if isinstance(lines, dict):

        if "rec_texts" in lines:

            texts = lines["rec_texts"]

    # PaddleOCR 2.x
    else:

        for line in lines:

            if len(line) > 1:

                texts.append(line[1][0])

    return " ".join(texts)
