import os
import time
import traceback
import numpy as np
import cv2

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from services.detector import detect_plate
from services.ocr import read_plate
from services.formatter import format_plate


# ==========================================================
# FastAPI
# ==========================================================

app = FastAPI(title="PBMS AI OCR Service", version="2.0.0")

# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production nên giới hạn domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# Root
# ==========================================================


@app.get("/")
def root():
    return {"service": "PBMS AI OCR Service", "status": "running", "version": "2.0.0"}


# ==========================================================
# Health Check
# ==========================================================


@app.get("/health")
def health():
    return {"status": "ok"}


# ==========================================================
# OCR API
# ==========================================================


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):

    total_start = time.time()

    try:

        # ==================================================
        # Read Image
        # ==================================================

        decode_start = time.time()

        contents = await file.read()

        np_arr = np.frombuffer(contents, np.uint8)

        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return JSONResponse(
                status_code=400, content={"success": False, "message": "Invalid image."}
            )

        print(f"Decode Time : {(time.time()-decode_start):.3f}s")

        # ==================================================
        # YOLO Detect
        # ==================================================

        detect_start = time.time()

        plate_image = detect_plate(image)

        print(f"YOLO Time   : {(time.time()-detect_start):.3f}s")

        if plate_image is None:

            return JSONResponse(
                status_code=404,
                content={"success": False, "message": "License plate not found."},
            )

        # ==================================================
        # EasyOCR
        # ==================================================

        ocr_start = time.time()

        raw_text = read_plate(plate_image)

        print(f"OCR Time    : {(time.time()-ocr_start):.3f}s")

        # ==================================================
        # Formatter
        # ==================================================

        format_start = time.time()

        plate_number = format_plate(raw_text)

        print(f"Format Time : {(time.time()-format_start):.3f}s")

        # ==================================================
        # Validate
        # ==================================================

        if plate_number == "":

            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "message": "Cannot recognize license plate.",
                },
            )

        # ==================================================
        # Total
        # ==================================================

        total_time = time.time() - total_start

        print("=" * 50)
        print(f"TOTAL TIME  : {total_time:.3f}s")
        print("=" * 50)

        return {
            "success": True,
            "raw_text": raw_text,
            "plate": plate_number,
            "processing_time": round(total_time, 3),
        }

    except Exception as e:

        traceback.print_exc()

        return JSONResponse(
            status_code=500, content={"success": False, "message": str(e)}
        )


# ==========================================================
# Local Run
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

