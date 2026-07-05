import * as ocrService from "../service/ocr.service.js";

export const readPlate = async (req, res) => {
  try {
    const result = await ocrService.readPlate(req.file);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};