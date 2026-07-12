from ultralytics import YOLO
import cv2
import numpy as np

# =====================================================
# Load model một lần duy nhất khi AI Service khởi động
# =====================================================
import os

# Resolve absolute path to weight file relative to repository root
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
weight_path = os.path.join(repo_root, "weights", "license_plate_detector.pt")
plate_detector = YOLO(weight_path)


def resize_image(image: np.ndarray, max_size: int = 640):
    """
    Resize ảnh trước khi detect để tăng tốc YOLO.

    Args:
        image: Ảnh gốc
        max_size: Cạnh dài nhất

    Returns:
        resized_image, scale
    """

    h, w = image.shape[:2]

    if max(h, w) <= max_size:
        return image, 1.0

    scale = max_size / max(h, w)

    resized = cv2.resize(
        image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
    )

    return resized, scale


def detect_plate(image: np.ndarray):
    """
    Detect biển số xe bằng YOLO.

    Parameters
    ----------
    image : numpy.ndarray

    Returns
    -------
    numpy.ndarray | None

    Trả về ảnh biển số đã crop.
    """

    if image is None:
        return None

    # Resize để YOLO chạy nhanh hơn
    resized_image, scale = resize_image(image)

    # thử imgsz sang 512 xem thay đổi như thế nào
    results = plate_detector.predict(
        source=image, classes=[0], max_det=1, imgsz=512, conf=0.35, verbose=False
    )

    if not results:
        return None

    boxes = results[0].boxes

    if boxes is None or len(boxes) == 0:
        return None

    # Chọn box có confidence cao nhất
    best_box = max(boxes, key=lambda b: float(b.conf[0]))

    x1, y1, x2, y2 = map(int, best_box.xyxy[0])

    # Chuyển tọa độ về ảnh gốc
    x1 = int(x1 / scale)
    y1 = int(y1 / scale)
    x2 = int(x2 / scale)
    y2 = int(y2 / scale)

    # Padding để tránh cắt sát biển số
    padding = 10

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(image.shape[1], x2 + padding)
    y2 = min(image.shape[0], y2 + padding)

    crop = image[y1:y2, x1:x2]

    if crop.size == 0:
        return None

    # Phóng to vùng biển số giúp OCR chính xác hơn
    crop = cv2.resize(crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    return crop
